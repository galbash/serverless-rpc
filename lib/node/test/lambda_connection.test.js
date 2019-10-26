import proxyquire from 'proxyquire';
import sinon from 'sinon';
import chai, { should, expect } from 'chai';
import chaiEvents from 'chai-events';
import { TBinaryProtocol, TBufferedTransport } from 'thrift';

proxyquire.noCallThru();
should();
chai.use(chaiEvents);

describe('TLambdaConnection tests', () => {
  function createServerResponse(response) {
    const payload = JSON.stringify(response.toString('base64'));
    return {
      Payload: payload,
    };
  }
  beforeEach(() => {
    this.payload = Buffer.from('1234', 'utf-8');
    this.invokeStub = sinon.stub().returns(Promise.resolve(createServerResponse(this.payload)));
    const self = this;
    class LambdaStub {
      invoke = () => ({
        promise: self.invokeStub,
      })
    }
    const {
      ConnectionClosedError,
      TLambdaConnection,
    } = proxyquire('../lib/lambda_connection', {
      'aws-sdk': {
        Lambda: LambdaStub,
      },
    });
    this.ConnectionClosedError = ConnectionClosedError;
    this.TLambdaConnection = TLambdaConnection;
    this.serverName = 'test-server-name';
  });

  it('constructor no params', () => {
    const conn = new this.TLambdaConnection();
    expect(conn.protocol).to.equal(TBinaryProtocol);
    expect(conn.transport).to.equal(TBufferedTransport);
  });

  it('constructor params', () => {
    const protocol = class StubProtocol {};
    const transport = class StubTransport {};
    const conn = new this.TLambdaConnection({
      serverName: this.serverName,
      protocol,
      transport,
    });
    expect(conn.protocol).to.equal(protocol);
    expect(conn.transport).to.equal(transport);
  });

  it('close sanity', async () => {
    const conn = new this.TLambdaConnection();
    const cp = conn.should.emit('close');
    conn.close();
    expect(() => conn.write('1')).to.throw(this.ConnectionClosedError);
    await cp;
  });

  it('open sanity', async () => {
    const conn = new this.TLambdaConnection();
    const cp = conn.should.emit('close');
    const op = conn.should.emit('open');
    conn.close();
    conn.open();
    await conn.write('1234');
    await cp;
    await op;
  });

  it('isOpen sanity', () => {
    const conn = new this.TLambdaConnection();
    expect(conn.isOpen()).to.be.true;
    conn.close();
    expect(conn.isOpen()).to.be.false;
    conn.open();
    expect(conn.isOpen()).to.be.true;
  });

  it('test lambda server error', async () => {
    const conn = new this.TLambdaConnection({
      serverName: this.serverName,
    });
    const ep = conn.should.emit('error');
    this.invokeStub.rejects();
    await conn.write('134');
    await ep;
  });

  it('test lambda server error FunctionError', async () => {
    const conn = new this.TLambdaConnection({
      serverName: this.serverName,
    });
    const ep = conn.should.emit('error');
    this.invokeStub.resolves(Promise.resolve({ FunctionError: new Error() }));
    await conn.write('134');
    await ep;
  });
});
