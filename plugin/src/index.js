import fs from 'fs-extra';
import cp from 'child_process';

export default class ServerlessThriftRPC {
  constructor(sls = {}, opts) {
    this.sls = sls;
    this.prefix =
      opts.prefix ||
      this.sls.config.servicePath ||
      process.env.npm_config_prefix;
    this.originalServicePath = this.sls.config.servicePath;
    this.commands = {
      rpc: {
        usage: 'Builds the RPC function',
        lifecycleEvents: ['generate-client', 'run', 'clean'],
        commands: {
          clean: {
            usage: 'Cleans up extra files if necessary',
            lifecycleEvents: ['init'],
          },
          run: {
            usage: 'Generates RPC handlers',
            lifecycleEvents: ['init'],
          },
          'generate-client': {
            usage: 'Generates client libraries',
            lifecycleEvents: ['init']
          }
        },
      },
    };

    this.hooks = {
      'after:package:initialize': this.run.bind(this),
      'before:deploy:function:packageFunction': this.run.bind(this),
      'before:invoke:local:invoke': this.run.bind(this),
      'before:offline:start:init': this.run.bind(this),
      'before:step-functions-offline:start': this.run.bind(this),
      'after:package:createDeploymentArtifacts': this.cleanup.bind(this),
      'after:invoke:local:invoke': this.cleanup.bind(this),
      'rpc:clean:init': this.cleanup.bind(this),
      'rpc:run:init': this.run.bind(this),
      'rpc:generate-server:init': this.generateServer.bind(this),
      'rpc:generate-client:init': this.generateClients.bind(this),
    };
  }

  log(format, ...args) {
    this.sls.cli.log(`[serverless-thrift-rpc] ${format}`, ...args);
  }

  serviceLanguage() {
    let { runtime } = this.sls.service.provider;
    if (!runtime) {
      return null;
    }

    if (runtime.startsWith('python')) {
      return 'py';
    }

    return null;
  }

  config() {
    return Object.assign({
      // thrift generation
      includeDirs: ['.'],
      serviceDefinitionPath: 'service.thrift',
      generatedFilesPath: 'gen',

      // client library config
      clients: [],
      generateClients: true,

      // server config
      generateServer: true,
      language: this.serviceLanguage(),
      outputPath: 'thrift_gen',
    }, (this.sls.service.custom || {}).rpc || {});
  }

  generateThrift(includeDirs, outDir, target, serviceDef) {
    fs.mkdirpSync(outDir);
    let res = cp.spawnSync(
      'thrift',
      ['-I', includeDirs.join(' '), '-r', '-out', outDir, '--gen', target, serviceDef],
      //`thrift -I ${includeDirs.join(' ')} -r -out ${outDir} --gen ${target} ${serviceDef}`
    );

    this.log(JSON.stringify(res));

  }

  async run() {
    let config = this.config();
    if (config.generateServer) {
      await this.generateServer();
    }

    await this.generateHandler();
    if (config.generateClients) {
      await this.generateClients();
    }

  }

  findFuncs() {
    return Object.entries(this.sls.service.functions)
      .reduce((result, pair) => {
        const [key, func] = pair;
        const runtime = func.runtime || this.sls.service.provider.runtime;
        const { rpc }  = func.events || {};

        if (!rpc) {
          return result;
        }

        const { disable, service } = rpc || {};
        const handler = _.isString(func.handler) ? func.handler.split('.') : [];
        const relativePath = handler.slice(0, -1).join('.');

        if (disable) {
          this.log(`Epsagon is disabled for function ${key}, skipping.`);
          return result;
        }

        if (!_.isString(runtime)) {
          return result;
        }

        const language = SUPPORTED_LANGUAGES.find((lang => runtime.match(lang)));
        if (!language) {
          this.log(`Runtime "${runtime}" is not supported yet, skipping function ${key}`);
          return result;
        }

        result.push(Object.assign(func, {
          method: _.last(handler),
          key,
          relativePath,
          language,
          epsagonHandler: `${key}-epsagon`,
        }));
        return result;
      }, []);
  }

  async generateHandler() {
    let config = this.config();
    const handlerCode = generateWrapperCode(func, this.config());
    await writeFile(
      join(
        handlersFullDirPath,
        generateWrapperExt(func)
      ),
      handlerCode
    );

  }
  async generateServer() {
    let config = this.config();
    this.generateThrift(
      config.includeDirs,
      config.outputPath,
      config.genOptions ? `${config.language}:${config.genOptions}` : config.language,
      config.serviceDefinitionPath
    );
  }

  async cleanup() {

  }

  async generateClients() {
    let config = this.config();
    config.clients.forEach((client) => {
        this.generateThrift(
          config.includeDirs,
          client.outputPath,
          client.genOptions ? `${client.language}:${client.genOptions}` : client.language,
          config.serviceDefinitionPath
        );
    });
  }
}
