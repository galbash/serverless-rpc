"""
Transports for using with AWS Lambda
"""
import base64
import binascii
import json

import boto3
from thrift.transport import TTransport
from thrift.compat import BufferIO


class LambdaTransportError(TTransport.TTransportException):
    """
    Base class for Lambda Transport errors.
    """
    pass


class LambdaServerError(LambdaTransportError):
    """
    A Lambda-related server error (internal to the Lambda server,
    not the user application)
    """
    def __init__(self, response):
        """
        :param response: The response received from Lambda
        """
        super(LambdaServerError, self).__init__(message=response['Payload'].read().decode('utf-8'))
        self.ecode = response['StatusCode']
        self.etype = response['FunctionError']


class PayloadDecodeError(LambdaTransportError):
    """
    Error decoding the payload according to the Lambda transport
    communication protocol
    """
    def __init__(self, payload):
        """
        :param payload: The payload we failed decoding
        """
        super(PayloadDecodeError, self).__init__(message='Failed decoding payload')
        self.payload = payload


class TTransformTransport(TTransport.TTransportBase):
    """
    A transport that transforms the written payload and supplies it as read payload.
    The transformation can be any kind of Synchronous operation, either a computation
    or a result of a network call.
    """
    def __init__(self, value=None, offset=0):
        """
        :param value: a value to read from for stringio
            If value is set, the read buffer will be initialized with it
            otherwise, it is for writing
        :param offset: the offset to start reading from.
        """
        if value is not None:
            self.__read_buffer = BufferIO(value)
        else:
            self.__read_buffer = BufferIO()
        if offset:
            self.__read_buffer.seek(offset)
        self.__write_buffer = BufferIO()

    def isOpen(self):
        """
        :return: True if the transport is open, False otherwise
        """
        return (not self.__read_buffer.closed) and (not self.__write_buffer.closed)

    def close(self):
        """
        closes the transport
        """
        self.__read_buffer.close()
        self.__write_buffer.close()

    def read(self, sz):
        """
        reads from the transport
        :param sz: number of bytes to read
        :return: the data read
        """
        return self.__read_buffer.read(sz)

    def write(self, buf):
        """
        writes to the transport
        :param buf: the buffer to write
        """
        self.__write_buffer.write(buf)

    def _transform(self, buf):
        """
        Transforms the data written, and sets it as data to be read
        :param buf: The data written to the transport
        :return: The data to set as readable from the transport
        """
        return buf

    def flush(self):
        """
        flushes the transport (verify all previous writes actually written)
        """
        self.__read_buffer = BufferIO(self._transform(self.__write_buffer.getvalue()))
        self.__write_buffer = BufferIO()

    def getvalue(self):
        """
        :return: all the current data available for read from the transport
        """
        return self.__read_buffer.getvalue()


class TLambdaServerTransport(TTransformTransport):
    """
    Server transport for Lambda communication. Implements the Lambda transport
    protocol - decodes payload on initialization, and encodes on getvalue.
    """
    def __init__(self, value=None):
        """
        :param value: data to initialize the transport with. base64 encoded
        """
        if value:
            value = base64.b64decode(value)
        super().__init__(value=value)


    def getvalue(self):
        """
        see :func:TTransformTransport.getvalue
        :return:
        """
        return base64.b64encode(super().getvalue())


class TLambdaClientTransport(TTransformTransport):
    """
    Transport for client side of Lambda communication.
    """
    def __init__(self, function_name, qualifier=None, **kwargs):
        """
        :param function_name: The name of the server Lambda
        :param qualifier: The Lambda qualifier to use. Defaults to $LATEST
        :param kwargs: Additional arguments, passed to the Lambda client constructor
        """
        super().__init__()
        self.__client = boto3.client('lambda', **kwargs)
        self.__function_name = function_name
        self.__qualifier = qualifier

    def _transform(self, buf):
        """
        Transforms the data written, and sets it as data to be read.
        base64 encodes the data, sends the message and sets the response
        as the data to be read.
        :param buf: The data written to the transport
        :return: The data to set as readable from the transport
        """
        trans_input = super()._transform(buf)
        return self.__invoke(trans_input)

    def __invoke(self, message):
        """
        Invokes a Lambda with the current transport value
        :param message: The current transport value
        :return: The response received from the Lambda server
        """
        params = {
            'FunctionName': self.__function_name,
            'InvocationType': 'RequestResponse',
            'Payload': json.dumps(base64.b64encode(message).decode('utf-8'))
        }
        if self.__qualifier:
            params['Qualifier'] = self.__qualifier

        response = self.__client.invoke(**params)

        if 'FunctionError' in response:
            raise LambdaServerError(response)

        raw_payload = response['Payload'].read()
        try:
            return base64.b64decode(json.loads(
                raw_payload.decode('utf-8')
            ).encode('utf-8'))
        except (
            binascii.Error,
            json.JSONDecodeError,
            UnicodeDecodeError,
            UnicodeEncodeError
        ) as e:
            raise PayloadDecodeError(raw_payload) from e
