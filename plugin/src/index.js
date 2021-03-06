import fs from 'fs-extra';
import _ from 'lodash';
import { join } from 'path';
import { generateWrapperCode, generateWrapperExt, SUPPORTED_LANGUAGES } from './handlers';
import generateThrift from './thrift_utils';

/**
 * A plugin to enable auto generation for Thrift-compatible Lambda server
 */
export default class ServerlessThriftRPC {
  /**
   * @param sls The serverless object for this execution
   * @param opts Additional options
   */
  constructor(sls = {}, opts) {
    this.sls = sls;
    this.prefix =
      opts.prefix ||
      this.sls.config.servicePath ||
      process.env.npm_config_prefix;
    this.originalServicePath = this.sls.config.servicePath;
    this.funcs = [];
    this.funcsFound = false;
    this.commands = {
      rpc: {
        usage: 'Builds the RPC function',
        lifecycleEvents: [],
        commands: {
          clean: {
            usage: 'Cleans up extra files if necessary',
            lifecycleEvents: ['init'],
          },
          generate: {
            usage: 'Generates RPC handlers',
            lifecycleEvents: ['init'],
          },
          'generate-clients': {
            usage: 'Generates client libraries',
            lifecycleEvents: ['init'],
          },
          'clean-clients': {
            usage: 'Cleans client libraries',
            lifecycleEvents: ['init'],
          },
          'generate-server': {
            usage: 'Generates server thrift libraries',
            lifecycleEvents: ['init'],
          },
          'clean-server': {
            usage: 'Cleans server thrift libraries',
            lifecycleEvents: ['init'],
          },
        },
      },
    };

    this.hooks = {
      'after:package:initialize': this.generateAll.bind(this),
      'before:deploy:function:packageFunction': this.generateAll.bind(this),
      'before:invoke:local:invoke': this.generateAll.bind(this),
      'before:offline:start:init': this.generateAll.bind(this),
      'before:step-functions-offline:start': this.generateAll.bind(this),
      'after:package:createDeploymentArtifacts': this.cleanup.bind(this),
      'after:invoke:local:invoke': this.cleanup.bind(this),
      'rpc:clean:init': this.cleanup.bind(this),
      'rpc:generate:init': this.generateAll.bind(this),
      'rpc:generate-server:init': this.generateServer.bind(this),
      'rpc:clean-server:init': this.cleanServer.bind(this),
      'rpc:generate-clients:init': this.generateClients.bind(this),
      'rpc:clean-clients:init': this.cleanClients.bind(this),
    };
  }

  /**
   * Logs a message to the console
   * @param format The log format
   * @param args The log arguments
   */
  log(format, ...args) {
    this.sls.cli.log(`[serverless-thrift-rpc] ${format}`, ...args);
  }

  /**
   * @return {String} returns the service runtime.
   * */
  serviceRuntime() {
    return this.sls.service.provider.runtime;
  }

  /**
   * @return {Object} The current rpc plugin config
   */
  config() {
    return Object.assign({
      // thrift generation
      includeDirs: ['.'],
      outputPath: '.',

      // client library config
      generateClients: true,

      // server config
      generateServer: true,
      cleanServer: false,
      language: this.serviceRuntime(),

      // generated code config
      handlersDirName: 'serverless_rpc_handlers',
    }, (this.sls.service.custom || {}).rpc || {});
  }

  /**
   * Generates the server Thrift, the server handlers and the client Thrift
   */
  async generateAll() {
    this.log('assigning RPC event handlers');
    const config = this.config();
    if (config.generateServer) {
      await this.generateServer();
    } else {
      this.funcs = this.findFuncs();
    }

    await this.generateHandlers();

    if (config.generateClients) {
      await this.generateClients();
    }
  }

  /**
   * Finds RPC functions in the service and returns a list of these
   * functions enriched with additional data needed for wrapping
   * Caches the functions, so doing the calculation only once per execution.
   * @return {Array<Object>} The list of functions.
   */
  findFuncs() {
    if (this.funcsFound) {
      return this.funcs;
    }
    this.funcsFound = true;
    return Object.entries(this.sls.service.functions)
      .reduce((result, pair) => {
        const [key, func] = pair;
        const runtime = func.runtime || this.sls.service.provider.runtime;

        const { rpc } = func;

        if (!rpc || !_.isString(rpc.service)) {
          // not an rpc triggered function
          return result;
        }

        const handler = _.isString(func.handler) ? func.handler.split('.') : [];
        const relativePath = handler.slice(0, -1).join('.');

        if (!_.isString(runtime)) {
          throw new Error(`Runtime must be set for serverless-rpc function ${key}`);
        }

        const language = SUPPORTED_LANGUAGES.find((lang => runtime.match(lang)));
        if (!language) {
          throw new Error(`Runtime "${runtime}" is not supported yet for serverless-rpc function ${key}`);
        }

        result.push(Object.assign(func, {
          rpcHandlerObject: _.last(handler),
          key,
          relativePath,
          language,
          rpcConfig: rpc,
          rpcHandlerFile: `${key}_serverless_rpc`,
        }));
        return result;
      }, []);
  }

  /**
   * Generates wrapping handlers for server initialization
   */
  async generateHandlers() {
    fs.removeSync(join(this.originalServicePath, this.config().handlersDirName));
    await this.generateHandlersCode();
    this.assignHandlers();
  }

  /**
   * Generates and writes the handlers code to the disk.
   */
  async generateHandlersCode() {
    const handlersFullDirPath = join(
      this.originalServicePath,
      this.config().handlersDirName
    );
    try {
      fs.mkdirpSync(handlersFullDirPath);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
    }

    await Promise.all(this.funcs.map(async (func) => {
      const handlerCode = generateWrapperCode(func, this.config());
      await fs.writeFile(
        join(
          handlersFullDirPath,
          generateWrapperExt(func)
        ),
        handlerCode
      );
    }));
  }

  /**
   * Updates the SLS object with the generated wrapping handlers for the
   * appropriate functions.
   */
  assignHandlers() {
    this.funcs.forEach((func) => {
      const handlerPath = `${this.config().handlersDirName.replace('\\', '/')}/${func.rpcHandlerFile}`;
      const serviceFunc = this.sls.service.functions[func.key];
      serviceFunc.handler = `${handlerPath}.${func.rpcHandlerObject}`;

      // Adding handler to include (in case it was excluded).
      if (_.isObject(serviceFunc.package) && _.isObject(serviceFunc.package.include)) {
        serviceFunc.package.include = [...serviceFunc.package.include, handlerPath];
      }
    });

    // Adding the general rpc handlers dir to include (in case it was excluded).
    if (_.isObject(this.sls.service.package.include)) {
      this.sls.service.package.include = [
        ...this.sls.service.package.include,
        `${this.config().handlersDirName.replace('\\', '/')}/**`,
      ];
    }
  }

  /**
   * Generates server's code from service IDL.
   */
  async generateServer() {
    this.log('generating server');
    const serviceConfig = this.config();
    this.funcs = this.findFuncs();
    this.funcs.forEach((func) => {
      const { rpcConfig } = func;
      const runtime = func.runtime || this.serviceRuntime();

      const genOptions = rpcConfig.genOptions || serviceConfig.genOptions;
      generateThrift(
        rpcConfig.includeDirs || serviceConfig.includeDirs,
        rpcConfig.outputPath || serviceConfig.outputPath,
        runtime,
        this.getServiceDefinitionPath(rpcConfig),
        genOptions
      );
    });
  }

  /**
   * Finds the definition path of a specific thrift service
   * @param rpcConfig a function's RPC config
   * @return {string} The service's path
   */
  getServiceDefinitionPath(rpcConfig) {
    return `${rpcConfig.service.split('.').slice(0, -1).join('.')}.thrift`;
  }

  /**
   * Cleans all plugin-generated files
   */
  async cleanup() {
    this.log('starting cleanup');
    const config = this.config();
    fs.removeSync(join(this.originalServicePath, config.handlersDirName));

    if (config.cleanServer) {
      if (config.outputPath === '.') {
        throw new Error('cleanServer option can only be specified with outputPath');
      }
      await this.cleanServer();
    }
  }

  /**
   * Cleans server generated code (from IDL)
   */
  async cleanServer() {
    this.log('cleaning server');
    const serviceConfig = this.config();
    this.funcs = this.findFuncs();
    this.funcs.forEach((func) => {
      // only skip clean if false is actually specified.
      const { clean = true } = func.rpcConfig;
      if (clean) {
        fs.removeSync(func.rpcConfig.outputPath || serviceConfig.outputPath);
      }
    });
  }

  /**
   * Cleans client generated code (from IDL)
   */
  async cleanClients() {
    this.log('cleaning clients');
    this.funcs = this.findFuncs();
    this.funcs.forEach((func) => {
      const { rpcConfig } = func;
      rpcConfig.clients.forEach((client) => {
        // only skip clean if false is actually specified.
        const { clean = true } = client;

        if (clean) {
          fs.removeSync(client.outputPath);
        }
      });
    });
  }

  /**
   * Generates clients from service IDL, according to configuration
   */
  async generateClients() {
    this.log('generating clients');
    const serviceConfig = this.config();
    this.funcs = this.findFuncs();
    this.funcs.forEach((func) => {
      const { rpcConfig } = func;
      if (!rpcConfig.clients) {
        return;
      }

      rpcConfig.clients.forEach((client) => {
        generateThrift(
          rpcConfig.includeDirs || serviceConfig.includeDirs,
          client.outputPath,
          client.language,
          this.getServiceDefinitionPath(rpcConfig),
          client.genOptions
        );
      });
    });
  }
}
