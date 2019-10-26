# Thrift RPC Serverless Framework Plugin
[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![npm version](https://badge.fury.io/js/serverless-plugin-thrift.svg)](https://badge.fury.io/js/serverless-plugin-thrift)
[![Build Status](https://travis-ci.com/galbash/serverless-plugin-thrift.svg?branch=master)](https://travis-ci.com/galbash/serverless-plugin-thrift)
Serverless Framework plugin to enable thrift RPC events as function triggers

## Installation
### Install thrift and serverless-thrift
For [Node.js functions](https://www.npmjs.com/package/serverless-thrift):
```
npm install --save thrift serverless-thrift
```

For [Python functions](https://pypi.org/project/serverless-thrift):
```
pip install thrift serverless-thrift
```
### Install The Plugin
Using the Serverless Framework:
```
sls plugin install --name serverless-plugin-thrift
```

Or using NPM:
```
npm install --save-dev serverless-plugin-thrift
```
When installing with NPM, add the plugin to your `serverless.yml` file:
```yaml
plugins:
  - serverless-plugin-thrift
```
For the best results, make sure this is the first plugin specified in your
plugins list.

## Basic Usage
To register an RPC handler as a function event, use the following when defining your function
```
functions:
  my-rpc-function:
    handler: handler.app  # handler should be the file containing your RPC handler.
                          # app should be an initialized RPC handler object, which should
                          # be registered to the processor
    rpc:
      service: path/to/service/file.ServiceName  # e.g. tutorial.Calculator for
                                                 # Calculator service in tutorial.thrift file
```

## Client Generation
In order to generate clients for the service, define clients to the server:
```
functions:
  my-rpc-function:
    handler: handler.app
    rpc:
      service: path/to/service/file.ServiceName
      clients:
        - language: py  # one of the supported languages
          outputPath: path/to/client/generated/files
```

You can generate as many clients as you'd like for a single service.

## Additional Commands
See `sls rpc --help`

## Options
### Service Level Options
These options are defined at the service level, under the `custom.rpc` member
of your `serverless.yml` file. Any function level option will override options
defined here. Available options:
* `includeDirs` - Directories to include when generating thrift code. defaults to '.'.
* `outputPath` - Path to store the generated server thrift files. defaults to '.'
* `generateClients` - `true` if clients should be generated, `false` otherwise. defaults to `true`.
* `generateServer` - `true` if server thrift should be generated, `false` otherwise. defaults to `false`.
if this option is specified, outputPath different then '.' must be specified as well.
* `cleanServer` - `true` if server thrift should be cleaned after packaging, `false` otherwise. defaults to `true`.
* `handlersDirName` - Customize the name of the directory rpc stores its
handlers in. Do not use this option unless you know what you are doing :)

### Function Level Options
These options are defined at the function level, under the `rpc` member
of your function in the `serverless.yml` file. Available options:
* `service` - Path to the thrift service. contains the path to the file (without the `.thrift`)
suffix, and then the implemented service name. For example if a `Calculator` service is defined
in `example/tutorial.thrift` file, this member should be set to `example/tutorial.Calculator`
* `includeDirs` - Directories to include when generating thrift code. defaults to '.'.
* `outputPath` - Path to store the generated server thrift files. defaults to '.'
* `genOptions` - Additional options to pass to the thrift compiler
* `clean` - `true` if the generated server files should be cleaned after packaging, `false` otherwise.
defaults to `true`
* `clients` - a list of clients for which generations should occur:
  * `language` - the language in which the client should be generated (required)
  * `clean` - `true` if the generated client files should be cleaned after packaging, `false` otherwise.
defaults to `true` (required)
  * `outputPath` - Path to store the generated client thrift files. 
  * `genOptions` - Additional options to pass to the thrift compiler

## FAQ
* Does this plugin work with webpack?
    * Yes! you can use webpack or any serverless plugins utilizing webpack with
      this plugin. Just make sure to specify this plugin before any other
      plugin in your `serverless.yml`:
      ```yaml
      plugins:
        - serverless-plugin-thrift
        - serverless-webpack
        - any-other-plugin
      ```
* Unable to import module `serverless_rpc_handlers` error:
    * During deployment, the plugin creates `serverless_rpc_handler/` dir to wrap the function. Please make sure this dir is not excluded somewhere.
