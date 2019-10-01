#!/usr/bin/env bash
thrift -I thrift -r -out client --gen py thrift/tutorial.thrift
thrift -I thrift -r -out server --gen py thrift/tutorial.thrift
