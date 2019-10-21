import { join } from 'path';
import _ from 'lodash';

const WRAPPER_CODE = {
  node: `
const serverlessThrift = require('serverless-thrift');
const { HANDLER: rpcInternalHandler } = require('../HANDLER_PATH.js');
const SERVICE = require('../SERVICE_PATH');

module.exports.EXPORTED_SERVER = serverlessThrift.createLambdaServer(
    SERVICE,
    rpcInternalHandler
);
`,
  python: `
from HANDLER_PATH import HANDLER as rpc_internal_handler
from SERVICE_PATH import SERVICE
from serverless_thrift.server.TLambdaServer import TLambdaServer

processor = SERVICE.Processor(rpc_internal_handler)
EXPORTED_SERVER = TLambdaServer(processor)
`,
};

const FILE_NAME_BY_LANG_GENERATORS = {
  python: (name => `${name}.py`),
  node: (name => `${name}.js`),
};

export const SUPPORTED_LANGUAGES = Object.keys(WRAPPER_CODE);

/**
 * fixes a file path to be imported, based on a language.
 * @param path The path of the file to be imported
 * @param language The function language
 * @return {String} The fixed path
 */
function fixImportPathByLanguage(path, language) {
  switch (language) {
  case 'python':
    return path.replace(/\//g, '.').replace(/\\/g, '.');

  default:
    return path;
  }
}

/**
 * Calculates the path in which the RPC service is defined, based on the language
 * @param outputPath The path the RPC files were generated to
 * @param serviceDirName The name of the service directory
 * @param serviceName The name of the service
 * @param language The function language
 * @return {String} The path to the service, ready to be imported (language appropriate)
 */
function getServicePathByLanguage(outputPath, serviceDirName, serviceName, language) {
  let path;
  switch (language) {
  case 'python':
    path = join(outputPath, serviceDirName);
    break;

  case 'node':
    path = join(outputPath, serviceName);
    break;

  default:
    path = join(outputPath, serviceDirName);
    break;
  }

  return fixImportPathByLanguage(path, language);
}

/**
 * Generates RPC wrapper code for a single function
 * @param func The sls function
 * @param config The service's RPC config
 * @return {String} The generated wrapper code
 */
export function generateWrapperCode(func, config) {
  const relativePath = fixImportPathByLanguage(func.relativePath, func.language);
  const { exportedHandlerName = func.rpcHandlerObject } = func;
  const [serviceDirName, serviceName] = _.last(
    func.rpcConfig.service.replace(/\\/g, '/').split('/')
  ).split('.');
  const servicePath = getServicePathByLanguage(
    func.rpcConfig.outputPath || config.outputPath,
    serviceDirName,
    serviceName,
    func.language
  );
  return WRAPPER_CODE[func.language]
    .replace(/HANDLER_PATH/g, relativePath)
    .replace(/HANDLER/g, func.rpcHandlerObject)
    .replace(/SERVICE_PATH/g, servicePath)
    .replace(/SERVICE/g, serviceName)
    .replace(/EXPORTED_SERVER/g, exportedHandlerName);
}

/**
 * Generates a full name for a wrapper.
 * @param {Object} func The function to wrap.
 * @return {String} The generated name.
 */
export function generateWrapperExt(func) {
  return FILE_NAME_BY_LANG_GENERATORS[func.language](func.rpcHandlerFile);
}
