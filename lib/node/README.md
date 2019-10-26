# Thrift serverless library for Node.js
[![Build Status](https://travis-ci.com/galbash/serverless-rpc.svg?token=wsveVqcNtBtmq6jpZfSf&branch=master)](https://travis-ci.com/galbash/serverless-rpc)
[![npm version](https://badge.fury.io/js/serverless-thrift.svg)](https://badge.fury.io/js/serverless-thrift)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

This package provides an implementation of a Thrift client and server over serverless functions
for Node.js

## Installation

From your project directory:

```sh
npm install --save serverless-thrift
```

## Getting started (AWS Lambda)

Simply use the `createLambdaServer` function to wrap your Thrift handler:

```node
const serverlessThrift = require("serverless-thrift")
const Calculator = require("./gen-nodejs/Calculator");
const handler = require("./calculator_handler.js");

const server = serverlessThrift.createLambdaServer(Calculator, handler);
module.exports.handle = server.handle.bind(server);
```

A full example is located under the [example](./example) directory

