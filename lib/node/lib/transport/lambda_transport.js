import Lambda from "aws-sdk/clients/lambda";

class TMessageSenderTransport {
  constructor() {
    this._wbuf = Buffer.alloc(0);
  }

  write(buffer) {
    if (typeof buffer === "string") {
      buffer = Buffer.from(buffer, "utf-8");
    }

    this._wbuf = Buffer.concat(this._wbuf, buffer);
  }

  flush(cb) {
    const value = this._wbuf.toString("base64");
    this._wbuf = Buffer.alloc(0);
    return this.sendMessage(value, cb);
  }
}

/**
 * Lambda based transport for Apache Thrift clients
 */
export class TLambdaTransport extends TMessageSenderTransport {
  constructor(functionName, qualifier, options) {
    this.qualifier = qualifier;
    this.functionName = functionName;
    this.client = new Lambda(options);
  }

  sendMessage(message, cb) {
    const params = {
      FunctionName: this.functionName,
      InvocationType: "RequestResponse",
      Payload: JSON.stringify(message)
    };

    if (this.qualifier) {
      params.Qualifier = this.qualifier;
    }

    const response = this.client.invoke(params, (err, data) => {
      if (err) {
      } // handle
    });
  }
}
