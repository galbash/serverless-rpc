# Serverless RPC
[![Build Status](https://travis-ci.com/galbash/serverless-rpc.svg?token=wsveVqcNtBtmq6jpZfSf&branch=master)](https://travis-ci.com/galbash/serverless-rpc)
[![npm version](https://badge.fury.io/js/serverless-thrift.svg)](https://badge.fury.io/js/serverless-thrift)
[![PypiVersions](https://img.shields.io/pypi/v/serverless-thrift.svg)](https://pypi.org/project/serverless-thrift/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
run RPC servers on serverless functions.

# Project Hirarchy
* lib/ -  Contains the Thrift transport library implementation, subdivided by
       language of implementation.
```

cpp/
go/
java/
php/
py/
rb/
...
```
* plugin/ -  contains a js package that is the serverless-rpc-plugin

# CI/CD
## Versioning
The project uses semantic versioning, along with semantic release which automates the release process. For each merge to master, we will check if a deploy is required. The semantic release will be configured for each library to look only for relevant commits (meaning that if the commit scope is py-<something>, only the python library will be affected by this commit). It will look for commits of type “fix”, “feat” or breaking changes, increase the version accordingly and release a new version only if required.
The scope prefixes are:
py - Python
node - Node.js
plugin - serverless framework plugin
all - affects the entire project


