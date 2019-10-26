import fs from 'fs-extra';
import cp from 'child_process';

/**
 * Converts a Lambda runtime name to a Thrift language name. If already given a thrift
 * Language, returns it unchanged.
 * @param runtime The Lambda runtime name
 * @return {String} The language name
 */
function runtimeToThriftLanguage(runtime) {
  if (!runtime) {
    return null;
  }

  if (runtime.startsWith('py')) {
    return 'py';
  }

  if (runtime.startsWith('node') || runtime.startsWith('js')) {
    return 'js';
  }

  return null;
}

/**
 * Generates thrift code from IDL
 * @param includeDirs directories to search .thrift files in
 * @param outDir The directory to output the generated files to
 * @param runtime The Lambda runtime or thrift language
 * @param options The options to use for generation
 * @param serviceDef the path for the service to generate
 */
export default function generateThrift(includeDirs, outDir, runtime, serviceDef, options = '') {
  const language = runtimeToThriftLanguage(runtime);
  let usedOptions = options;
  if (language === 'js') {
    usedOptions = `node,${options}`;
  }
  const target = usedOptions && usedOptions !== '' ? `${language}:${usedOptions}` : language;
  fs.mkdirpSync(outDir);
  cp.spawnSync(
    'thrift',
    ['-I', includeDirs.join(' '), '-r', '-out', outDir, '--gen', target, serviceDef]
  );
}
