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
        super(LambdaServerError, self).__init__(response['Payload'].read())
        print(response)
        self.ecode = response['StatusCode']
        self.etype = response['FunctionError']


class PayloadDecodeError(LambdaTransportError):
    def __init__(self, payload):
        """
        @param payload: The payload we failed decoding
        """
        super(PayloadDecodeError, self).__init__('Failed decoding payload')
        self.payload = payload


class TLambdaBaseTransport(TTransport.TMemoryBuffer):
    def __init__(self, value=None):
        if value:
            value = base64.b64decode(value)
        super().__init__(value=value)

    def flush(self):
        x = self._buffer.read()
        print(x)
        self._buffer = BufferIO(base64.b64encode(x))
        #self._buffer = BufferIO(base64.b64encode(self._buffer.read()))


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

    def flush(self):
        super().flush()
        result = self.sendMessage(self._buffer.read())
        self.write(result)

    def sendMessage(self, message):
        print('message', message)
        params = {
            'FunctionName': self.__function_name,
            'InvocationType': 'RequestResponse',
            'Payload': json.dumps(message.decode('utf-8'))
        }
        print('params', params)
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

