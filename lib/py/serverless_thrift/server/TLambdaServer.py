"""
A Thrift server for AWS Lambda
"""
from .TFunctionServer import TFunctionServer
from ..transport.TLambda import TLambdaServerTransport


class TLambdaServer(TFunctionServer):
    """
    A Thrift server for AWS Lambda
    """
    def __handle(self, event, context):
        """
        Handles a request (Lambda invocation)
        :param event: The event the Lambda was triggered with
        :param context: The context the Lambda was triggered with
        :return: The result of the server's execution
        """
        client = TLambdaServerTransport(event.encode('utf-8'))
        itrans = self.inputTransportFactory.getTransport(client)
        iprot = self.inputProtocolFactory.getProtocol(itrans)
        otrans = self.outputTransportFactory.getTransport(client)
        oprot = self.outputProtocolFactory.getProtocol(otrans)

        self.processor.process(iprot, oprot)

        result = otrans.getvalue().decode('utf-8')
        return result

        # not supported yet
        # if isinstance(self.inputProtocolFactory, THeaderProtocolFactory):
        # otrans = None
        # oprot = iprot
        # else:
        # otrans = self.outputTransportFactory.getTransport(client)
        # oprot = self.outputProtocolFactory.getProtocol(otrans)

    def __call__(self, event, context):
        """
        see :func:handle
        """
        return self.__handle(event, context)
