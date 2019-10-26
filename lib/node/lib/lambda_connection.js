import { EventEmitter } from 'events';
import {
  TException,
  TApplicationException,
  TApplicationExceptionType
} from 'thrift/lib/nodejs/lib/thrift/thrift';
import {
  createClient,
  TBufferedTransport,
  TBinaryProtocol
} from 'thrift';
import InputBufferUnderrunError from 'thrift/lib/nodejs/lib/thrift/input_buffer_underrun_error';
import AWS from 'aws-sdk';

/**
 * Base class for Lambda connection errors.
 */
export class LambdaConnectionError extends TException {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * A Lambda-related server error (internal to the Lambda server,
 * not the application)
 */
export class LambdaServerError extends LambdaConnectionError {
  /**
   *
   * @param {Lambda.Types.InvocationResponse} response The response received
   *     from Lambda
   */
  constructor(response) {
    if (response instanceof Error) {
      super(response.message);
    } else {
      super(response.Payload.toString('utf-8'));
    }
    this.ecode = response.StatusCode;
    this.etype = response.FunctionError;
  }
}

/**
 * Error decoding the payload according to the Lambda transport
 * communication protocol
 */
export class PayloadDecodeError extends LambdaConnectionError {
  constructor(payload) {
    super('Failed decoding payload');
    this.payload = payload;
  }
}


/**
 * Error that is raised when a read / write attempt is performed
 * against a closed transport
 */
export class ConnectionClosedError extends LambdaConnectionError {
  constructor() {
    super('Connection is closed');
  }
}

/**
 * A Lambda Connection a client can use to send RPC request to a Lambda-based thrift server.
 * @example
 *     var thrift = require('thrift');
 *     var options = {
 *        transport: thrift.TBufferedTransport
 *        protocol: thrift.TJSONProtocol,
 *        qualifier: 2,
 *        ...additional Lambda client constructor options
 *     };
 *     var con = thrift.createLambdaConnection("lambda-server", options);
 *     var client = thrift.createLambdaClient(myService, connection);
 *     client.myServiceFunction();
 */
export class TLambdaConnection extends EventEmitter {
  #open = true;

  #serverName;

  #qualifier;

  #clientOptions;

  #client;

  protocol;

  transport;

  seqId2Service = {};

  /**
   * Initializes a Thrift HttpConnection instance (use createHttpConnection() rather than
   *    instantiating directly).
   * @param {ConnectOptions} options - The configuration options to use.
   * @event {error} The "error" event is fired when a Node.js error event occurs during
   *     request or response processing, in which case the node error is passed on. An "error"
   *     event may also be fired when the connection can not map a response back to the
   *     appropriate client (an internal error), generating a TApplicationException.
   * @classdesc TLambdaConnection objects provide Thrift end point transport
   *     semantics implemented over the aws-sdk Lambda's invoke method.
   * @see {@link createLambdaConnection}
   */
  constructor(connectOptions) {
    super();
    const {
      serverName,
      qualifier,
      protocol,
      transport,
      ...clientOptions
    } = connectOptions;
    this.#serverName = serverName;
    this.#clientOptions = clientOptions || {};
    this.#qualifier = qualifier;
    this.protocol = protocol || TBinaryProtocol;
    this.transport = transport || TBufferedTransport;
    this.#client = new AWS.Lambda(this.#clientOptions);
    this.emit('open');
  }

  /**
   * @return {boolean} True if the connection is open, False otherwise
   */
  isOpen() {
    return this.#open;
  }

  /**
   * opens the connection
   */
  open() {
    this.#open = true;
    this.emit('open');
  }

  /**
   * closes the connection
   */
  close() {
    this.#open = false;
    this.emit('close');
  }

  end = this.close.bind(this);

  /**
   * decodes the transport receiver callback and invokes the response
   * handler using the client.
   * @param transportWithData A transport with data ready to be read from it.
   */
  decodeCallback(transportWithData) {
    const proto = new this.protocol(transportWithData);
    try { /* eslint-disable no-underscore-dangle */
      // no need to loop as the Lambda server returns one response at a time.
      const header = proto.readMessageBegin();
      const dummySeqId = header.rseqid * -1;
      let { client } = this;
      // The Multiplexed Protocol stores a hash of seqid to service names
      //  in seqId2Service. If the SeqId is found in the hash we need to
      //  lookup the appropriate client for this call.
      //  The client var is a single client object when not multiplexing,
      //  when using multiplexing it is a service name keyed hash of client
      //  objects.
      const serviceName = this.seqId2Service[header.rseqid];
      if (serviceName) {
        client = this.client[serviceName];
        delete this.seqId2Service[header.rseqid];
      }
      /* jshint -W083 */
      client._reqs[dummySeqId] = (err, success) => {
        transportWithData.commitPosition();
        const clientCallback = client._reqs[header.rseqid];
        delete client._reqs[header.rseqid];
        if (clientCallback) {
          process.nextTick(() => {
            clientCallback(err, success);
          });
        }
      };
      /* jshint +W083 */
      if (client[`recv_${header.fname}`]) {
        client[`recv_${header.fname}`](proto, header.mtype, dummySeqId);
      } else {
        delete client._reqs[dummySeqId];
        this.emit('error',
          new TApplicationException(
            TApplicationExceptionType.WRONG_METHOD_NAME,
            'Received a response to an unknown RPC function'
          ));
      }
    } catch (e) { /* eslint-enable no-underscore-dangle */
      if (e instanceof InputBufferUnderrunError) {
        transportWithData.rollbackPosition();
      } else {
        this.emit('error', e);
      }
    }
  }

  /**
   * Handles a response from the Lambda thrift server
   * @param response The response from the Lambda server
   */
  handleLambdaResponse(response) {
    if (response.FunctionError) {
      this.emit('error', new LambdaServerError(response));
    }

    try {
      const parsedResponse = Buffer.from(JSON.parse(response.Payload.toString('utf-8')), 'base64');
      this.transport.receiver(this.decodeCallback.bind(this))(parsedResponse);
    } catch (error) {
      throw new PayloadDecodeError(response.Payload);
    }
  }

  /**
   * Writes Thrift message data to the connection
   * @param {Buffer} data - A Node.js Buffer containing the data to write.
   * @throws {TranportClosedError} If a write is attempted when the transport is closed.
   * @throws {Error} synchronous errors raised from teh Lambda client are rethrown.
   * @event {error} the "error" event is raised upon request failure passing the
   *     Node.js error object to the listener.
   */
  write(data) {
    if (!this.isOpen()) {
      throw new ConnectionClosedError();
      // Send data and register a callback to invoke the client callback
    }
    const params = {
      FunctionName: this.#serverName,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(data.toString('base64')),
    };

    if (this.#qualifier) {
      params.Qualifier = this.#qualifier;
    }

    this.#client.invoke(params).promise()
      .then(this.handleLambdaResponse.bind(this))
      .catch(err => this.emit('error', new LambdaServerError(err)));
  }
}

/**
 * Creates a Lambda connection
 * @param {String} serverName The name of the Lambda operating as the server
 * @param {ConnectOptions} options The configuration options to use.
 */
export function createLambdaConnection(serverName, options) {
  return new TLambdaConnection({
    serverName,
    ...options,
  });
}

export const createLambdaClient = createClient;
