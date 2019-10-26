# Thrift serverless library for Python
[![Build Status](https://travis-ci.com/galbash/serverless-rpc.svg?token=wsveVqcNtBtmq6jpZfSf&branch=master)](https://travis-ci.com/galbash/serverless-rpc)
[![PypiVersions](https://img.shields.io/pypi/v/serverless-thrift.svg)](https://pypi.org/project/serverless-thrift/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)


This package provides an implementation of a Thrift client and server over serverless functions
for Python

## Installation

From your project directory:

```sh
pip install serverless-thrift
```

## Getting started (AWS Lambda)

Simply use the `TLambdaServer` create a server from your processor:

```node
from serverless_thrift.server.TLambdaServer import TLambdaServer
from calulator_handler import CalculatorHandler
handler = CalculatorHandler()
processor = Calculator.Processor(handler)
server = TLambdaServer(processor)
```

A full example is located under the [example](./example) directory

