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

        return oprot.read().decode('utf-8')

        # not supported yet
        # if isinstance(self.inputProtocolFactory, THeaderProtocolFactory):
        # otrans = None
        # oprot = iprot
        # else:
        # otrans = self.outputTransportFactory.getTransport(client)
        # oprot = self.outputProtocolFactory.getProtocol(otrans)
    def __call__(self, event, context):
        print(event)
        return self.handle(event, context)
