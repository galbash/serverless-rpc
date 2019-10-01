import io
import pytest
import base64
import json
import binascii
import unittest.mock

import serverless_thrift.transport.TLambda as TLambda

def assert_trans_read_empty(trans):
    assert trans.read(1) == b''

def assert_trans_read_content(trans, value):
    assert trans.read(len(value)) == value
    assert_trans_read_empty(trans)


class TestTTransformTransport:
    """
    Tests for :class:~TLambda.TTransformTransport
    """

    def test_close(self):
        trans = TLambda.TTransformTransport()
        trans.close()
        with pytest.raises(ValueError):
            trans.write('123')

        with pytest.raises(ValueError):
            trans.read(1)

    def test_isOpen(self):
        trans = TLambda.TTransformTransport()
        assert trans.isOpen()
        trans.close()
        assert not trans.isOpen()

    def test_read_empty(self):
        trans = TLambda.TTransformTransport()
        assert_trans_read_empty(trans)

    def test_read_initial_value(self):
        value = b'1234'
        trans = TLambda.TTransformTransport(value)
        assert_trans_read_content(trans, value)

    def test_write_no_flush(self):
        """
        Assert that no data is transformed and set for read until flush
        """
        value = b'1234'
        trans = TLambda.TTransformTransport()
        trans.write(value)
        assert_trans_read_empty(trans)

    def test_write_flush_read(self):
        """
        Assert that data is transformed after flush and ready to be read
        """
        value = b'1234'
        trans = TLambda.TTransformTransport()
        trans.write(value)
        trans.flush()
        assert_trans_read_content(trans, value)

    def test_flush_empty(self):
        trans = TLambda.TTransformTransport()
        trans.flush()
        assert_trans_read_empty(trans)

    def test_getvalue_empty(self):
        trans = TLambda.TTransformTransport()
        assert trans.getvalue() == b''

    def test_getvalue_initial_value(self):
        value = b'1234'
        trans = TLambda.TTransformTransport(value)
        assert trans.getvalue() == value

    def test_getvalue_write_no_flush(self):
        value = b'1234'
        trans = TLambda.TTransformTransport()
        trans.write(value)
        assert trans.getvalue() == b''

    def test_getvalue_write_with_flush(self):
        value = b'1234'
        trans = TLambda.TTransformTransport()
        trans.write(value)
        trans.flush()
        assert trans.getvalue() == value


class TestTLambdaServerTransport:
    """
    Tests for :class:~TLambda.TLambdaServerTransport
    """
    def test_init_invalid_value(self):
        """
        Test for initializing with non-base64 encoded value
        """
        value = b'12342134525'
        with pytest.raises(binascii.Error):
            TLambda.TLambdaServerTransport(value)

    def test_decode_initial_value(self):
        value = b'1234'
        trans = TLambda.TLambdaServerTransport(base64.b64encode(value))
        assert_trans_read_content(trans, value)

    def test_empty_initial(self):
        trans = TLambda.TLambdaServerTransport()
        assert_trans_read_empty(trans)

    def test_getvalue_empty(self):
        trans = TLambda.TLambdaServerTransport()
        assert trans.getvalue() == b''

    def test_getvalue_initial_value(self):
        value = b'1234'
        trans = TLambda.TLambdaServerTransport(base64.b64encode(value))
        assert trans.getvalue() == base64.b64encode(value)

    def test_getvalue_write_no_flush(self):
        value = b'1234'
        trans = TLambda.TLambdaServerTransport()
        trans.write(value)
        assert trans.getvalue() == b''

    def test_getvalue_write_with_flush(self):
        value = b'1234'
        trans = TLambda.TLambdaServerTransport()
        trans.write(value)
        trans.flush()
        assert trans.getvalue() == base64.b64encode(value)


class TestTLambdaClientTransport:
    """
    Tests for :class:~TLambda.TLambdaClientTransport
    """
    TEST_FUNCTION_NAME = 'test-function'
    TEST_PAYLOAD = b'request'
    TEST_RESPONSE_PAYLOAD = b'response'

    def test_read_no_write(self):
        client_mock_obj = unittest.mock.NonCallableMagicMock()
        with unittest.mock.patch(
            'boto3.client',
            side_effect=[client_mock_obj]
        ) as client_mock:
            trans = TLambda.TLambdaClientTransport(function_name=self.TEST_FUNCTION_NAME)
            assert_trans_read_empty(trans)
            client_mock.assert_called_once()


    def test_read_no_flush(self):
        client_mock_obj = unittest.mock.NonCallableMagicMock()
        with unittest.mock.patch(
            'boto3.client',
            side_effect=[client_mock_obj]
        ) as client_mock:
            trans = TLambda.TLambdaClientTransport(function_name=self.TEST_FUNCTION_NAME)
            trans.write(self.TEST_PAYLOAD)
            assert_trans_read_empty(trans)
            client_mock.assert_called_once()


    @staticmethod
    def _create_test_mock(expected_response):
        client_mock_obj = unittest.mock.NonCallableMagicMock()
        client_mock_obj.invoke.return_value = expected_response
        return client_mock_obj

    @staticmethod
    def _validate_invocation(client_mock_obj, function_name, payload, qualifier=None):
        expected_params = {
            'FunctionName': function_name,
            'InvocationType': 'RequestResponse',
            'Payload': json.dumps(base64.b64encode(payload).decode('utf-8'))
        }

        if qualifier:
            expected_params['Qualifier'] = qualifier

        client_mock_obj.invoke.assert_called_once_with(**expected_params)

    @staticmethod
    def _create_server_response(response):
        response_payload_encoded = json.dumps(
            base64.b64encode(response).decode('utf-8')
        )

        return {
            'Payload': io.BytesIO(response_payload_encoded.encode('utf-8'))
        }

    def test_read_after_flush_valid_response(self):
        response = self._create_server_response(self.TEST_RESPONSE_PAYLOAD)
        client_mock_obj = self._create_test_mock(response)

        with unittest.mock.patch(
                'boto3.client',
                side_effect=[client_mock_obj]
        ) as client_mock:
            trans = TLambda.TLambdaClientTransport(function_name=self.TEST_FUNCTION_NAME)
            trans.write(self.TEST_PAYLOAD)
            trans.flush()
            assert_trans_read_content(trans, self.TEST_RESPONSE_PAYLOAD)
            client_mock.assert_called_once()
            self._validate_invocation(
                client_mock_obj,
                self.TEST_FUNCTION_NAME,
                self.TEST_PAYLOAD
            )

    def test_read_after_flush_valid_response_with_qualifier(self):
        response = self._create_server_response(self.TEST_RESPONSE_PAYLOAD)
        client_mock_obj = self._create_test_mock(response)
        qualifier = 1

        with unittest.mock.patch(
                'boto3.client',
                side_effect=[client_mock_obj]
        ) as client_mock:
            trans = TLambda.TLambdaClientTransport(
                function_name=self.TEST_FUNCTION_NAME,
                qualifier=qualifier
            )
            trans.write(self.TEST_PAYLOAD)
            trans.flush()
            assert_trans_read_content(trans, self.TEST_RESPONSE_PAYLOAD)
            client_mock.assert_called_once()
            self._validate_invocation(
                client_mock_obj,
                self.TEST_FUNCTION_NAME,
                self.TEST_PAYLOAD,
                qualifier=qualifier
            )

    def test_read_after_flush_function_error(self):
        response = {
            'StatusCode': 500,
            'FunctionError': 'Internal Server Error',
            'Payload': io.BytesIO(b'internal lambda error')
        }
        client_mock_obj = self._create_test_mock(response)

        with unittest.mock.patch(
                'boto3.client',
                side_effect=[client_mock_obj]
        ) as client_mock:
            trans = TLambda.TLambdaClientTransport(function_name=self.TEST_FUNCTION_NAME)
            trans.write(self.TEST_PAYLOAD)
            with pytest.raises(TLambda.LambdaServerError):
                trans.flush()
            assert_trans_read_empty(trans)
            client_mock.assert_called_once()
            self._validate_invocation(
                client_mock_obj,
                self.TEST_FUNCTION_NAME,
                self.TEST_PAYLOAD
            )

    @pytest.mark.parametrize("response", [
        {
            'Payload': io.BytesIO(b'bad unicode encoding: \xff')
        },
        {
            'Payload': io.BytesIO(b'not a json dumped string')
        },
        {
            'Payload': io.BytesIO(b'"not a valid base64 string"')
        },
    ])
    def test_read_after_flush_invalid_response(self, response):
        client_mock_obj = self._create_test_mock(response)

        with unittest.mock.patch(
                'boto3.client',
                side_effect=[client_mock_obj]
        ) as client_mock:
            trans = TLambda.TLambdaClientTransport(function_name=self.TEST_FUNCTION_NAME)
            trans.write(self.TEST_PAYLOAD)
            with pytest.raises(TLambda.PayloadDecodeError):
                trans.flush()
            assert_trans_read_empty(trans)
            client_mock.assert_called_once()
            self._validate_invocation(
                client_mock_obj,
                self.TEST_FUNCTION_NAME,
                self.TEST_PAYLOAD
            )
