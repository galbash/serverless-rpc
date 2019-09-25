const WRAPPER_CODE = {
  python: `
from HANDLER_PATH import HANDLER
from SERVICE_PATH import SERVICE
from sls_rpc.server.TLambdaServer import TLambdaServer

handler = CONTROLLER()
processor = SERVICE.Processor(handler)
EXPORTED_SERVER = TLambdaServer(processor)
`,
};

const FILE_NAME_BY_LANG_GENERATORS = {
  python: (name => `${name}.py`),
  node: (name => `${name}.js`),
};

export const SUPPORTED_LANGUAGES = Object.keys(WRAPPER_CODE);

export function generateWrapperCode(config) {
  let { wrapper } = (func.epsagon || {});
  if (!wrapper) {
    wrapper = DEFAULT_WRAPPERS[func.language];
  }

  const relativePath = (
    func.language === 'python' ?
      func.relativePath.replace(/\//g, '.').replace(/\\/g, '.') :
      func.relativePath
  );
  return WRAPPER_CODE[func.language]
    .replace(/RELATIVE_PATH/g, relativePath)
    .replace(/METHOD/g, func.method)
    .replace(/WRAPPER_TYPE/g, wrapper)
    .replace(/TOKEN/g, epsagonConf.token)
    .replace(/APP_NAME/g, epsagonConf.appName)
    .replace(/COLLECTOR_URL/g, epsagonConf.collectorURL ?
      `'${epsagonConf.collectorURL}'` : undefined)
    .replace(/METADATA_ONLY/g, epsagonConf.metadataOnly === true ? '1' : '0');
}

/**
 * Generates a full name for a wrapper.
 * @param {Object} func The function to wrap.
 * @return {String} The generated name.
 */
export function generateWrapperExt(func) {
  return FILE_NAME_BY_LANG_GENERATORS[func.language](func.epsagonHandler);
}
