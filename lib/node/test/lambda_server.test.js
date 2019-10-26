import { TBinaryProtocol } from 'thrift';
import sinon from 'sinon';
import { expect } from 'chai';
import { TLambdaServer, createLambdaServer } from '../lib/index';

describe('TLambdaServer tests', async () => {
  beforeEach(() => {
    this.callback = sinon.fake();
    this.processor = {
      process: sinon.stub(),
    };
    this.context = sinon.fake();
  });

  it('sanity', () => {
    const server = new TLambdaServer(this.processor);
    server.handle('', this.context, this.callback);
    expect(this.processor.awsLambdaContext).to.equal(this.context);
    expect(this.processor.process.calledOnce).to.be.true;
    const { args } = this.processor.process.getCall(0);
    expect(args[0]).to.be.instanceOf(TBinaryProtocol);
    expect(args[1]).to.be.instanceOf(TBinaryProtocol);
  });

  it('custom protocol', () => {
    class StubProtocol {}
    const server = new TLambdaServer(
      this.processor,
      { protocol: StubProtocol }
    );
    server.handle('', this.context, this.callback);
    const { args } = this.processor.process.getCall(0);
    expect(args[0]).to.be.instanceOf(StubProtocol);
    expect(args[1]).to.be.instanceOf(StubProtocol);
  });

  it('processor error', () => {
    const server = new TLambdaServer(this.processor);
    this.processor.process.throws();
    expect(() => server.handle('', this.context, this.callback)).to.throw();
  });
});

describe('createLambdaServer tests', () => {
  beforeEach(() => {
    this.processor = sinon.stub();
    this.handler = { action: sinon.stub() };
  });
  it('use function', () => {
    const server = createLambdaServer(this.processor, this.handler);
    expect(server).to.be.instanceOf(TLambdaServer);
    expect(this.processor.called).to.be.true;
    const usedHandler = this.processor.getCall(0).args[0];
    expect(usedHandler).to.equal(this.handler);
  });

  it('use module', () => {
    const server = createLambdaServer({ Processor: this.processor }, this.handler);
    expect(server).to.be.instanceOf(TLambdaServer);
    expect(this.processor.called).to.be.true;
    const [usedHandler] = this.processor.getCall(0).args;
    expect(usedHandler).to.equal(this.handler);
  });

  it('use options', () => {
    class StubProtocol {}
    const options = { protocol: StubProtocol };
    const server = createLambdaServer(this.processor, this.handler, options);
    expect(server).to.be.instanceOf(TLambdaServer);
    expect(this.processor.called).to.be.true;
    const [usedHandler] = this.processor.getCall(0).args;
    expect(usedHandler).to.equal(this.handler);
  });
});
