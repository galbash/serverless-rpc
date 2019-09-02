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
    def __init__(self, response):
        """
        @param response: The response received from Lambda
        """
        super(LambdaServerError, self).__init__(message=response['Payload'].read().decode('utf-8'))
        self.ecode = response['StatusCode']
        self.etype = response['FunctionError']


class PayloadDecodeError(LambdaTransportError):
    def __init__(self, payload):
        """
        @param payload: The payload we failed decoding
        """
        super(PayloadDecodeError, self).__init__(message='Failed decoding payload')
        self.payload = payload


class TTransformTransport(TTransport.TTransportBase):
    def __init__(self, value=None, offset=0):
        """value -- a value to read from for stringio
        If value is set, the read buffer will be initialized with it
        otherwise, it is for writing"""
        if value is not None:
            self.__read_buffer = BufferIO(value)
        else:
            self.__read_buffer = BufferIO()
        if offset:
            self.__read_buffer.seek(offset)
        self.__write_buffer = BufferIO()

    def isOpen(self):
        return (not self.__read_buffer.closed) and (not self.__write_buffer.closed)

    def open(self):
        pass

    def close(self):
        self.__read_buffer.close()
        self.__write_buffer.close()

    def read(self, sz):
        return self.__read_buffer.read(sz)

    def write(self, buf):
        self.__write_buffer.write(buf)

    def _transform(self, input):
        """
        Transforms the data written, and sets it as data to be read
        :param input: The data written to the transport
        :return: The data to set as readble from the transport
        """
        return input

    def flush(self):
        self.__read_buffer = BufferIO(self._transform(self.__write_buffer.getvalue()))
        self.__write_buffer = BufferIO()

    def getvalue(self):
        return self.__read_buffer.getvalue()


class TLambdaBaseTransport(TTransformTransport):
    def __init__(self, value=None):
        if value:
            value = base64.b64decode(value)
        super().__init__(value=value)


    def _transform(self, input):
        trans_input = super()._transform(input)
        return base64.b64encode(trans_input)


class TLambdaClientTransport(TLambdaBaseTransport):
    def __init__(self, function_name, qualifier=None, **kwargs):
        """
        @param function_name: The name of the server Lambda
        @param qualifier: The Lambda qualifier to use. Defaults to $LATEST
        @param kwargs: Additional arguments, passed to the Lambda client constructor
        """
        super().__init__()
        self.__client = boto3.client('lambda', **kwargs)
        self.__function_name = function_name
        self.__qualifier = qualifier

    def _transform(self, input):
        trans_input = super()._transform(input)
        return self.sendMessage(trans_input)

    def sendMessage(self, message):
        params = {
            'FunctionName': self.__function_name,
            'InvocationType': 'RequestResponse',
            'Payload': json.dumps(message.decode('utf-8'))
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
        except (binascii.Error, json.JSONDecodeError, ) as e:
            raise PayloadDecodeError(raw_payload) from e
