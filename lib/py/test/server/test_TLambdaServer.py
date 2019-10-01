import base64
import json
import pytest
import unittest.mock

import serverless_thrift.server.TLambdaServer as TLambdaServer

@pytest.fixture()
def in_trans():
    trans = unittest.mock.NonCallableMagicMock()
    trans.getTransport.side_effect = lambda x: x
    return trans

@pytest.fixture()
def out_trans():
    trans = unittest.mock.NonCallableMagicMock()
    trans.getTransport.side_effect = lambda x: x
    return trans

@pytest.fixture()
def in_prot():
    prot = unittest.mock.NonCallableMagicMock()
    prot.getProtocol.side_effect = lambda x: {'trans': x}
    return prot

@pytest.fixture()
def out_prot():
    prot = unittest.mock.NonCallableMagicMock()
    prot.getProtocol.side_effect = lambda x: {'trans': x}
    return prot


class TestTLambdaServer:
    """
    Tests for :class:~TLambdaServer.TLambdaServer
    """

    def test_sanity(
            self,
            processor,
            in_trans,
            in_prot,
            out_trans,
            out_prot,
    ):
        """
        Test for a successful Lambda server invocation
        """
        expected_result = b'success'
        event = b'event'
        encoded_expected_result = base64.b64encode(expected_result).decode('utf-8')
        encoded_event = base64.b64encode(event).decode('utf-8')
        def processor_side_effect(iprot, oprot):
            oprot['trans'].write(expected_result)
            oprot['trans'].flush()

        processor.process.side_effect = processor_side_effect
        server = TLambdaServer.TLambdaServer(
            processor,
            in_trans,
            out_trans,
            in_prot,
            out_prot
        )

        result = server(encoded_event, {})
        assert result == encoded_expected_result
        in_trans.getTransport.assert_called_once()
        in_prot.getProtocol.assert_called_once()
        out_trans.getTransport.assert_called_once()
        out_prot.getProtocol.assert_called_once()

    def test_itrans_factory_error(
            self,
            processor,
            in_trans,
            in_prot,
            out_trans,
            out_prot,
    ):
        """
        Test for an error in the input transport factory
        """
        event = b'event'
        encoded_event = base64.b64encode(event).decode('utf-8')
        error = Exception('error')
        in_trans.getTransport.side_effect = error
        server = TLambdaServer.TLambdaServer(
            processor,
            in_trans,
            out_trans,
            in_prot,
            out_prot
        )

        with pytest.raises(type(error)):
            server(encoded_event, {})

        in_trans.getTransport.assert_called_once()
        in_prot.getProtocol.assert_not_called()
        out_trans.getTransport.assert_not_called()
        out_prot.getProtocol.assert_not_called()

    def test_iprot_factory_error(
            self,
            processor,
            in_trans,
            in_prot,
            out_trans,
            out_prot,
    ):
        """
        Test for an error in the input protocol factory
        """
        event = b'event'
        encoded_event = base64.b64encode(event).decode('utf-8')
        error = Exception('error')
        in_prot.getProtocol.side_effect = error
        server = TLambdaServer.TLambdaServer(
            processor,
            in_trans,
            out_trans,
            in_prot,
            out_prot
        )

        with pytest.raises(type(error)):
            server(encoded_event, {})

        in_trans.getTransport.assert_called_once()
        in_prot.getProtocol.assert_called_once()
        out_trans.getTransport.assert_not_called()
        out_prot.getProtocol.assert_not_called()

    def test_otrans_factory_error(
            self,
            processor,
            in_trans,
            in_prot,
            out_trans,
            out_prot,
    ):
        """
        Test for an error in the output transport factory
        """
        event = b'event'
        encoded_event = base64.b64encode(event).decode('utf-8')
        error = Exception('error')
        out_trans.getTransport.side_effect = error
        server = TLambdaServer.TLambdaServer(
            processor,
            in_trans,
            out_trans,
            in_prot,
            out_prot
        )

        with pytest.raises(type(error)):
            server(encoded_event, {})

        in_trans.getTransport.assert_called_once()
        in_prot.getProtocol.assert_called_once()
        out_trans.getTransport.assert_called_once()
        out_prot.getProtocol.assert_not_called()

    def test_oprot_factory_error(
            self,
            processor,
            in_trans,
            in_prot,
            out_trans,
            out_prot,
    ):
        """
        Test for an error in the output protocol factory
        """
        event = b'event'
        encoded_event = base64.b64encode(event).decode('utf-8')
        error = Exception('error')
        out_prot.getProtocol.side_effect = error
        server = TLambdaServer.TLambdaServer(
            processor,
            in_trans,
            out_trans,
            in_prot,
            out_prot
        )

        with pytest.raises(type(error)):
            server(encoded_event, {})

        in_trans.getTransport.assert_called_once()
        in_prot.getProtocol.assert_called_once()
        out_trans.getTransport.assert_called_once()
        out_prot.getProtocol.assert_called_once()


    def test_processor_error(
            self,
            processor,
            in_trans,
            in_prot,
            out_trans,
            out_prot,
    ):
        """
        Test for an error in the processor
        """
        event = b'event'
        encoded_event = base64.b64encode(event).decode('utf-8')
        error = Exception('error')

        processor.process.side_effect = error
        server = TLambdaServer.TLambdaServer(
            processor,
            in_trans,
            out_trans,
            in_prot,
            out_prot
        )

        with pytest.raises(type(error)):
            server(encoded_event, {})

        in_trans.getTransport.assert_called_once()
        in_prot.getProtocol.assert_called_once()
        out_trans.getTransport.assert_called_once()
        out_prot.getProtocol.assert_called_once()
