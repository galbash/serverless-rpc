from .TFunctionServer import TFunctionServer
from ..transport.TLambda import TLambdaBaseTransport


class TLambdaServer(TFunctionServer):
    def handle(self, event, context):
        client = TLambdaBaseTransport(event.encode('utf-8'))
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
        return self.handle(event, context)
