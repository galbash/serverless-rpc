import pytest
import thrift.transport.TTransport as TTransport
import thrift.protocol.TBinaryProtocol as TBinaryProtocol
import thrift.protocol.TJSONProtocol as TJSONProtocol

import serverless_thrift.server.TFunctionServer as TFunctionServer


class TestTFunctionServer:
    """
    Tests for :class:~TFunctionServer.TFunctionServer
    """

    def test_init_one_param(self, processor):
        """
        Test one parameter initializer
        """
        server = TFunctionServer.TFunctionServer(processor)
        self._assert_server_init(
            server,
            processor,
            TTransport.TTransportFactoryBase,
            TBinaryProtocol.TBinaryProtocolFactory,
        )

    def test_init_three_params(self, processor):
        """
        Test three parameters initializer
        """
        trans_class = TTransport.TFramedTransportFactory
        prot_class = TJSONProtocol.TJSONProtocolFactory
        server = TFunctionServer.TFunctionServer(
            processor,
            trans_class(),
            prot_class(),
        )
        self._assert_server_init(
            server,
            processor,
            trans_class,
            prot_class
        )

    def test_init_five_params(self, processor):
        """
        Test five parameters initializer
        """
        in_trans_class = TTransport.TFramedTransportFactory
        in_prot_class = TJSONProtocol.TJSONProtocolFactory
        out_trans_class = TTransport.TBufferedTransportFactory
        out_prot_class = TJSONProtocol.TSimpleJSONProtocolFactory
        server = TFunctionServer.TFunctionServer(
            processor,
            in_trans_class(),
            out_trans_class(),
            in_prot_class(),
            out_prot_class(),
        )
        self._assert_server_init(
            server,
            processor,
            in_trans_class,
            in_prot_class,
            out_trans_class,
            out_prot_class
        )

    @pytest.mark.parametrize("initializers", [
        [],
        [1, 2],
        [1, 2, 3, 4],
        [1, 2, 3, 4, 5, 6]

    ])
    def test_invalid_init(self, initializers):
        """
        Test initializing with an invalid parameters number
        """
        server = TFunctionServer.TFunctionServer(*initializers)
        with pytest.raises(AttributeError):
            server.processor

        with pytest.raises(AttributeError):
            server.inputTransportFactory

        with pytest.raises(AttributeError):
            server.inputProtocolFactory

        with pytest.raises(AttributeError):
            server.outputTransportFactory

        with pytest.raises(AttributeError):
            server.outputProtocolFactory

    @staticmethod
    def _assert_server_init(
            server,
            expected_processor,
            input_transport,
            input_protocol,
            output_transport=None,
            output_protocol=None
    ):

        output_protocol = output_protocol if output_protocol else input_protocol
        output_transport = output_transport if output_transport else input_transport
        assert server.processor is expected_processor
        assert isinstance(server.inputTransportFactory, input_transport)
        assert isinstance(server.outputTransportFactory, output_transport)
        assert isinstance(server.inputProtocolFactory, input_protocol)
        assert isinstance(server.outputProtocolFactory, output_protocol)
