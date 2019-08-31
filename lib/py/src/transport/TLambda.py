import base64
import binascii
import json
from io import BytesIO

import boto3
from thrift.transport import TTransport
from .TFunction import FunctionTransportError, TFunctionServerTransportBase

class LambdaTransportError(FunctionTransportError):
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

class TLambdaBaseTransport(TTransport.TMemoryBuffer):
    def __init__(self, value=None):
        if value:
            value = base64.b64decode(json.loads(
                    value
                ).encode('utf-8'))
        super().__init__(value=value)

    def getvalue():
        """
        returns the stored value, in a Lambda transport safe way
        (base 64 encoded string)
        """
        payload = super(TLambdaBaseTransport, self).getvalue()
        return json.dumps(
            base64.b64encode(payload).decode('utf-8')
        ).encode('utf-8')

class TLambdaClientTransport(TMessageSenderTransport):
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

    def flush(self):
        msg = self.getvalue()
        result = self.sendMessage(msg)
        self.write(result)

    def sendMessage(self, message):
        params = {
            'FunctionName': self.__function_name,
            'InvocationType': 'RequestResponse',
            'Payload': message
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

class TLambdaServerTransport(TFunctionServerTransportBase):
    def set_payload(self, event, context):
        """
        @param event: The event the Lambda was triggered with
        @param context: The context the Lambda was triggered with
        """
        self.__context = context
        self.__event = event
        self.payload = base64.base64.decode(event.encode('utf-8'))

    def accept(self):
        return TLambdaBaseTransport(self.__input)
