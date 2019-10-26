import { TBinaryProtocol } from 'thrift';
import { TLambdaServerTransport } from './lambda_transport';

/**
 * A Thrift server for AWS Lambda
 */
export class TLambdaServer {
  #protocol;

  #processor;

  /**
   * @param processor The processor to use for the server
   * @param options Additional options (protocol)
   */
  constructor(processor, options) {
    this.#protocol = (options && options.protocol) ? options.protocol : TBinaryProtocol;
    this.#processor = processor;
  }

  /**
   * handles a lambda execution
   * @param event the event the lambda was triggered with
   * @param context the context the lambda was triggered with
   */
  handle(event, context, callback) {
    const client = new TLambdaServerTransport(event, callback);
    const iprot = new this.#protocol(client);
    const oprot = new this.#protocol(client);

    this.#processor.awsLambdaContext = context; // make context accessible
    this.#processor.process(iprot, oprot);
  }
}

/**
 * Creates a Lambda server
 * @param processor The processor to use
 * @param handler The handler to use
 * @param options The options for the server
 * @return {TLambdaServer} The created Lambda server
 */
export function createLambdaServer(processor, handler, options) {
  const RealProcessor = processor.Processor ? processor.Processor : processor;

  return new TLambdaServer(new RealProcessor(handler), options);
}
