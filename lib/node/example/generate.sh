#!/usr/bin/env bash
thrift -I thrift -r -out client/gen-nodejs --gen js:node,es6 thrift/tutorial.thrift
thrift -I thrift -r -out server/gen-nodejs --gen js:node,es6 thrift/tutorial.thrift
