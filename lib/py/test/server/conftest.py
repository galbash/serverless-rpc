import pytest
import unittest.mock

@pytest.fixture()
def processor():
    return unittest.mock.NonCallableMagicMock()

