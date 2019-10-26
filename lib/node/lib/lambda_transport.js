import { TException } from 'thrift/lib/nodejs/lib/thrift/thrift';
import binary from 'thrift/lib/nodejs/lib/thrift/binary';

/**
 * Base class for Lambda Transport errors.
 */
export class LambdaTransportError extends TException {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error that is raised when a read / write attempt is performed
 * against a closed transport
 */
export class TransportClosedError extends LambdaTransportError {
  constructor() {
    super('Transport is closed');
  }
}

/**
 * A transport that transforms the written payload and supplies it as read payload.
 * The transformation can be any kind of Synchronous operation, either a computation
 * or a result of a network call.
 */
export class TTransformTransport {
  #readBuffer = Buffer.alloc(0);

  #writeBuffers = [];

  #open = true;

  #seqId = null;

  /**
   * @param value a value to read from.
   *     If value is set, the read buffer will be initialized with it
   *     otherwise, it is for writing
   */
  constructor(value) {
    if (value) {
      this.#readBuffer = Buffer.from(value);
    }
  }

  /**
   * @return {boolean} True if the transport is open, False otherwise
   */
  isOpen() {
    return this.#open;
  }

  /**
   * opens the transport
   */
  open() {
    this.#open = true;
  }

  /**
   * closes the transport
   */
  close() {
    this.#open = false;
  }

  /**
   * validates the transport is open
   */
  validateOpen() {
    if (!this.isOpen()) {
      throw new TransportClosedError();
    }
  }

  /**
   * reads from the transport
   * @param len number of bytes to read
   * @return {Buffer} the data read
   */
  read(len) {
    this.validateOpen();
    const result = this.#readBuffer.slice(0, len);
    this.#readBuffer = this.#readBuffer.slice(len);
    return result;
  }

  /**
   * reads all the data from the transport
   * @return {Buffer} the data the transport holds
   */
  readAll() {
    return this.read(this.#readBuffer.length);
  }

  /**
   * writes to the transport
   * @param buffer the buffer to write
   */
  write(buffer) {
    this.validateOpen();
    let realBuffer = buffer;
    if (typeof buffer === 'string') {
      realBuffer = Buffer.from(buffer, 'utf-8');
    }

    this.#writeBuffers.push(realBuffer);
  }

  /**
   * Transforms the data written, and sets it as data to be read
   * @param buf The data written to the transport
   * @return {Buffer} The data to set as readable from the transport
   */
  async transform(buf) {
    return buf;
  }

  /**
   * flushes the transport (verify all previous writes actually written)
   */
  async flush() {
    this.validateOpen();
    const writeBuffer = Buffer.concat(this.#writeBuffers);
    this.#readBuffer = await this.transform(writeBuffer);
    this.#writeBuffers = [];
  }

  /**
   * @return {Buffer} all the current data available for read from the transport
   */
  getvalue() {
    return Buffer.from(this.#readBuffer);
  }

  /**
   * sets the current message seqid.
   */
  setCurrSeqId(seqid) {
    this.#seqId = seqid;
  }

  /**
   * reads a byte from the transport
   */
  readByte() {
    return binary.readByte(this.read(1)[0]);
  }

  /**
   * reads a 16-bit integer from the transport
   */
  readI16() {
    return binary.readI16(this.read(2));
  }

  /**
   * reads a 32-bit integer from the transport
   */
  readI32() {
    return binary.readI32(this.read(4));
  }

  /**
   * reads a double from the transport
   */
  readDouble() {
    return binary.readDouble(this.read(8));
  }

  /**
   * reads a string from the transport
   * @param len the length of the string to read
   */

  readString(len) {
    return this.read(len).toString('utf-8');
  }
}

/**
 * Server transport for Lambda communication. Implements the Lambda transport
 * protocol - decodes payload on initialization, and encodes on getvalue.
 */
export class TLambdaServerTransport extends TTransformTransport {
  #callback;

  /**
   * @param value The value to initialize the transport with
   * @param callback The AWS Lambda callback to return the value to
   */
  constructor(value, callback) {
    let decodedValue;
    if (value) {
      decodedValue = Buffer.from(value, 'base64');
    }
    super(decodedValue);
    this.#callback = callback;
  }

  /**
   * @return {Buffer} all the current data available for read from the transport
   */
  getvalue() {
    return super.getvalue().toString('base64');
  }

  async flush() {
    await super.flush();
    this.#callback(null, this.getvalue());
  }
}

// /**
//  * Lambda based transport for Apache Thrift clients
//  */
// export class TLambdaClientTransport extends TTransformTransport {
//   #qualifier;
//
//   #functionName;
//
//   #client;
//
//   #connectionWriteCallback;
//
//   /**
//    * @param functionName The name of the server Lambda
//    * @param options options to pass to the Lambda client constructor
//    * @param qualifier The Lambda qualifier to use. Defaults to $LATEST
//    * @param callback The callback to call with data upon flush result.
//    */
//   constructor(functionName, options, qualifier, callback) {
//     super();
//     this.#qualifier = qualifier;
//     this.#functionName = functionName;
//     this.#client = new Lambda(options);
//   }
//
//   /**
//    * {@InheritDoc}
//    */
//   async transform(buf) {
//     const input = super.transform(buf);
//     return this.invoke(input);
//   }
//
//
//   /**
//    * Invokes a Lambda with the current transport value
//    * @param {Buffer} message The current transport value
//    * @return {Promise<Buffer>} The response received from the Lambda server
//    */
//   async invoke(message) {
//     const params = {
//       FunctionName: this.#functionName,
//       InvocationType: 'RequestResponse',
//       Payload: JSON.stringify(message.toString('base64')),
//     };
//
//     if (this.#qualifier) {
//       params.Qualifier = this.#qualifier;
//     }
//
//     let response;
//     try {
//       response = await this.#client.invoke(params).promise();
//     } catch (err) {
//       throw new LambdaServerError(err);
//     }
//
//     if (response.FunctionError) {
//       throw new LambdaServerError(response);
//     }
//
//     try {
//       return Buffer.from(JSON.parse(response.Payload.toString('utf-8')), 'base64');
//     } catch (error) {
//       throw new PayloadDecodeError(response.Payload);
//     }
//   }
// }
