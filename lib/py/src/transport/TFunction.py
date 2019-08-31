from thrift.transport import TTransport

class FunctionTransportError(TTransport.TTransportException):
    """
    Base class for Function Transport errors.
    """
    pass

class TFunctionServerTransportBase(object):
    @property
    def payload(self):
        return self.payload

    @payload.setter
    def payload(self, payload)
        self.__payload = payload

    def accept(self):
        pass
        

