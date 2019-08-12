import base64
import binascii
import json
from io import BytesIO

import boto3
from thrift import Thrift
from thrift.transport import TTransport

class LambdaTransportError(Thrift.TException):
    """
    Base class for Lambda Transport errors.
    """
    pass

class LambdaServerError(LambdaTransportError):
    def __init__(self, response):
        """
        @param response: The response received from Lambda
        """
        super(LambdaServerError, self).__init__(response['Payload'].read())
        self.ecode = response['statusCode']
        self.etype = response['FunctionError']

class PayloadDecodeError(LambdaTransportError):
    def __init__(self, payload):
        """
        @param payload: The payload we failed decoding
        """
        super(PayloadDecodeError, self).__init__('Failed decoding payload')
        self.payload = payload


class TMessageSenderTransport(TTransport.TTransportBase):
    def __init__(self):
        self.__wbuf = BytesIO()

    def write(self, buf):
        self.__wbuf.write(buf)

    def flush(self):
        msg = self.__wbuf.getvalue()
        self.__wbuf = BytesIO()
        return self.sendMessage(msg)

    def sendMessage(self, message):
        raise NotImplementedError

class TLambdaTransport(TMessageSenderTransport):
    def __init__(self, function_name, qualifier=None, **kwargs):
        """
        @param function_name: The name of the server Lambda
        @param qualifier: The Lambda qualifier to use. Defaults to $LATEST
        @param kwargs: Additional arguments, passed to the Lambda client constructor
        """
        super(TLambdaTransport, self).__init__()
        self.__client = boto3.client('lambda', **kwargs)
        self.__function_name = function_name
        self.__qualifier = qualifier

    def sendMessage(self, message):
        params = {
            'FunctionName': self.__function_name,
            'InvocationType': 'RequestResponse',
            'Payload': json.dumps(base64.b64encode(message).decode('utf-8')).encode('utf-8'),
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
