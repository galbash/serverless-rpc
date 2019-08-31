from thrift.protocol import THeaderProtocol

from .TFunctionServer import TFunctionServer

class TLambdaServer(TFunctionServer):
    def serve(self):
        client = self.serverTransport.accept()
        itrans = self.inputTransportFactory.getTransport(client)
        iprot = self.inputProtocolFactory.getProtocol(itrans)

	# for THeaderProtocol, we must use the same protocol instance for
	# input and output so that the response is in the same dialect that
	# the server detected the request was in.
	if isinstance(self.inputProtocolFactory, THeaderProtocolFactory):
	    otrans = None
	    oprot = iprot
	else:
	    otrans = self.outputTransportFactory.getTransport(client)
	    oprot = self.outputProtocolFactory.getProtocol(otrans)

        self.processor.process(iprot, oprot)
        result = otrans.getvalue() if otrans else itrans.getvalue()
        itrans.close()
        if otrans:
            otrans.close()

        return result

    def handle(event, context):
        self.serverTransport.set_invocation(event, context)
        return self.serve


