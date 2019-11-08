import fs from 'fs-extra';
import cp from 'child_process';

/**
 * Base class for Thrift errors
 */
export class ThriftError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * An error that is raised when the thrift compiler binary is not found.
 */
export class ThriftNotFoundError extends ThriftError {
  /**
   * @param path The path thrift was searched for
   */
  constructor(path) {
    super(`Could not locate the thrift compiler. searched for: "${path}". Please make sure it is installed.`);
    this.path = path;
  }
}

/**
 * An error that is raised when a thrift service generation fails.
 */
export class ThriftGenerationFailedError extends ThriftError {
  constructor(errorCode, stderr) {
    super(`Thrift generation failed. error code: ${errorCode}. stderr: ${stderr}`);
    this.errorCode = errorCode;
    this.stderr = stderr;
  }
}

/**
 * An error that is raised when a thrift service generation is interrupted.
 */
export class ThriftGenerationInterruptedError extends ThriftError {
  constructor(signal, stderr) {
    super(`Thrift generation interrupted. signal code: ${signal}. stderr: ${stderr}`);
    this.signal = signal;
    this.stderr = stderr;
  }
}

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
  const result = cp.spawnSync(
    'thrift',
    ['-I', includeDirs.join(' '), '-r', '-out', outDir, '--gen', target, serviceDef]
  );

  if (result.error) {
    if (result.error.errno === 'ENOENT') {
      throw new ThriftNotFoundError(result.error.path);
    }
    throw result.error;
  }

  if (result.status !== 0) {
    if (!result.status && result.signal) {
      throw new ThriftGenerationInterruptedError(result.signal, result.stderr);
    }
    throw new ThriftGenerationFailedError(result.status, result.stderr);
  }
}
