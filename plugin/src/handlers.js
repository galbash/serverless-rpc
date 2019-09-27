import { join } from 'path';
import _ from 'lodash';

const WRAPPER_CODE = {
  python: `
from HANDLER_PATH import HANDLER as rpc_internal_handler
from SERVICE_PATH import SERVICE
from sls_rpc.server.TLambdaServer import TLambdaServer

processor = SERVICE.Processor(rpc_internal_handler)
EXPORTED_SERVER = TLambdaServer(processor)
`,
};

const FILE_NAME_BY_LANG_GENERATORS = {
  python: (name => `${name}.py`),
  node: (name => `${name}.js`),
};

export const SUPPORTED_LANGUAGES = Object.keys(WRAPPER_CODE);

function getPathByLanguage(relativePath, language) {
  const path = (
    language === 'python' ?
      relativePath.replace(/\//g, '.').replace(/\\/g, '.') :
      relativePath
  );
  return path;
}

export function generateWrapperCode(func, config) {
  const relativePath = getPathByLanguage(func.relativePath, func.language);
  const { exportedHandlerName = func.rpcHandlerObject } = func;
  const [serviceDirName, serviceName] = _.last(
    func.rpcConfig.service.replace(/\\/g, '/').split('/')
  ).split('.');
  const servicePath = getPathByLanguage(join(
    func.rpcConfig.outputPath || config.outputPath,
    serviceDirName
  ), func.language);
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
