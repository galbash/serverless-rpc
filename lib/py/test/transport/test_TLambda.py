import pytest
import base64
import binascii

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


class TestTLambdaBaseTransport:
    """
    Tests for :class:~TLambda.TLambdaBaseTransport
    """
    def test_init_invalid_value(self):
        """
        Test for initializing with non-base64 encoded value
        :return:
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

