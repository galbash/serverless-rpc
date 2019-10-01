"""
A general server for function based (serverless) thrift servers
"""
from thrift.transport import TTransport
from thrift.protocol import TBinaryProtocol


class TFunctionServer:
    """
    A base class for Function (Faas) Thrift servers
    each server has a different handle method.

    Three constructors for all servers:
    1) (processor)
    2) (processor, transportFactory, protocolFactory)
    3) (processor,
        inputTransportFactory, outputTransportFactory,
        inputProtocolFactory, outputProtocolFactory)
    """

    def __init__(self, *args):
        if len(args) == 1:
            self.__initArgs__(args[0],
                              TTransport.TTransportFactoryBase(),
                              TTransport.TTransportFactoryBase(),
                              TBinaryProtocol.TBinaryProtocolFactory(),
                              TBinaryProtocol.TBinaryProtocolFactory())
        elif len(args) == 3:
            self.__initArgs__(args[0], args[1], args[1], args[2], args[2])
        elif len(args) == 5:
            self.__initArgs__(args[0], args[1], args[2], args[3], args[4])

    def __initArgs__(self, processor,
                     inputTransportFactory, outputTransportFactory,
                     inputProtocolFactory, outputProtocolFactory):
        self.processor = processor
        self.inputTransportFactory = inputTransportFactory
        self.outputTransportFactory = outputTransportFactory
        self.inputProtocolFactory = inputProtocolFactory
        self.outputProtocolFactory = outputProtocolFactory
