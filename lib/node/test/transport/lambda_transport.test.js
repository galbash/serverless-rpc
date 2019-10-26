import {
  TransportClosedError,
  TLambdaServerTransport
} from "../../lib";
import { TTransformTransport } from "../../lib/lambda_transport";
import sinon from "sinon";
import { expect } from "chai"

function assertTransReadEmpty(trans) {
  expect(Buffer.compare(trans.read(1), Buffer.alloc(0))).to.equal(0);
}

function assertTransReadContent(trans, value) {
  expect(Buffer.compare(trans.read(value.length), value)).to.equal(0);
  assertTransReadEmpty(trans);
}

describe('TTransformTransport tests', () => {
  function assertTransGVEmpty(trans) {
    expect(Buffer.compare(trans.getvalue(), Buffer.alloc(0))).to.equal(0);
  }

  function assertTransGVContent(trans, value) {
    expect(Buffer.compare(trans.getvalue(), value)).to.equal(0);

    // making sure getvalue did not consume the content
    expect(Buffer.compare(trans.getvalue(), value)).to.equal(0);
  }

  beforeEach(() => {
    this.payload = Buffer.from('1234', 'utf-8')
  });

  it('close sanity', () => {
    let trans = new TTransformTransport();
    trans.close();
    expect(() => trans.write('1')).to.throw(TransportClosedError);
    expect(() => trans.read()).to.throw(TransportClosedError);
  });

  it('open sanity', () => {
    let trans = new TTransformTransport();
    trans.close();
    trans.open();
    expect(() => trans.write('1')).to.not.throw();
    expect(() => trans.read()).to.not.throw();
  });

  it('isOpen sanity', () => {
    let trans = new TTransformTransport();
    expect(trans.isOpen()).to.be.true;
    trans.close();
    expect(trans.isOpen()).to.be.false;
    trans.open();
    expect(trans.isOpen()).to.be.true;
  });

  it('read empty', () => {
    let trans = new TTransformTransport();
    assertTransReadEmpty(trans);
  });

  it('read initial value buffer', () => {
    let trans = new TTransformTransport(this.payload);
    assertTransReadContent(trans, this.payload);
  });

  it('read initial value string', () => {
    let trans = new TTransformTransport(this.payload.toString('utf-8'));
    assertTransReadContent(trans, this.payload);
  });

  it('write no flush buffer', () => {
    let trans = new TTransformTransport();
    trans.write(this.payload);
    assertTransReadEmpty(trans);
  });

  it('write no flush string', () => {
    let trans = new TTransformTransport();
    trans.write(this.payload.toString('utf-8'));
    assertTransReadEmpty(trans);
  });

  it('write flush read buffer', async () => {
    let trans = new TTransformTransport();
    trans.write(this.payload);
    await trans.flush();
    assertTransReadContent(trans, this.payload);
  });

  it('write flush read string', async () => {
    let trans = new TTransformTransport();
    trans.write(this.payload.toString('utf-8'));
    await trans.flush();
    assertTransReadContent(trans, this.payload);
  });

  it('write flush empty', async () => {
    let trans = new TTransformTransport();
    await trans.flush();
    assertTransReadEmpty(trans);
    assertTransGVEmpty(trans);
  });

  it('getvalue empty', () => {
    let trans = new TTransformTransport();
    assertTransGVEmpty(trans);
  });

  it('getvalue initial value buffer', () => {
    let trans = new TTransformTransport(this.payload);
    assertTransGVContent(trans, this.payload);
  });

  it('getvalue initial value string', () => {
    let trans = new TTransformTransport(this.payload.toString('utf-8'));
    assertTransGVContent(trans, this.payload);
  });

  it('getvalue write no flush buffer', () => {
    let trans = new TTransformTransport();
    trans.write(this.payload);
    assertTransGVEmpty(trans);
  });

  it('getvalue write no flush string', () => {
    let trans = new TTransformTransport();
    trans.write(this.payload.toString('utf-8'));
    assertTransGVEmpty(trans);
  });

  it('write flush getvalue buffer', async () => {
    let trans = new TTransformTransport();
    trans.write(this.payload);
    await trans.flush();
    assertTransGVContent(trans, this.payload);
  });

  it('write flush getvalue string', async () => {
    let trans = new TTransformTransport();
    trans.write(this.payload.toString('utf-8'));
    await trans.flush();
    assertTransGVContent(trans, this.payload);
  });

  it('readByte sanity', () => {
    let byte = 124;
    let trans = new TTransformTransport(Buffer.of(byte));
    expect(trans.readByte()).to.equal(byte);
  });

  it('readByte negative', () => {
    let byte = -125;
    let trans = new TTransformTransport(Buffer.of(byte));
    expect(trans.readByte()).to.equal(byte);
  });

  it('readI16 sanity', () => {
    let int = 0x1234;
    let trans = new TTransformTransport(Buffer.of((int >> 8) & 0xff, int & 0xff));
    expect(trans.readI16()).to.equal(int);
  });

  it('readI16 negative', () => {
    let int = -0x1234;
    let trans = new TTransformTransport(Buffer.of((int >> 8) & 0xff, int & 0xff));
    expect(trans.readI16()).to.equal(int);
  });

  it('readI32 sanity', () => {
    let int = 0x12345678;
    let trans = new TTransformTransport(Buffer.of(
      (int >> 24) & 0xff,
      (int >> 16) & 0xff,
      (int >> 8) & 0xff,
      int & 0xff,
    ));
    expect(trans.readI32()).to.equal(int);
  });

  it('readI32 negative', () => {
    let int = -0x12345678;
    let trans = new TTransformTransport(Buffer.of(
      (int >> 24) & 0xff,
      (int >> 16) & 0xff,
      (int >> 8) & 0xff,
      int & 0xff,
    ));
    expect(trans.readI32()).to.equal(int);
  });

  it ('readDouble sanity', () => {
    let double = 1234.1234;
    let buf = Buffer.alloc(8);
    buf.writeDoubleBE(double);
    let trans = new TTransformTransport(buf);
    expect(trans.readDouble()).to.equal(double);
  });

  it ('readDouble negative', () => {
    let double = -1234.1234;
    let buf = Buffer.alloc(8);
    buf.writeDoubleBE(double);
    let trans = new TTransformTransport(buf);
    expect(trans.readDouble()).to.equal(double);
  });

  it('readString sanity', () => {
    let str = '12341234';
    let trans = new TTransformTransport(Buffer.from(str, 'utf-8'));
    expect(trans.readString(str.length)).to.equal(str);
  });
});

describe('TTransformTransport tests', () => {
  function assertTransGVEmpty(trans) {
    expect(trans.getvalue()).to.equal('');
  }

  function assertTransGVContent(trans, value) {
    expect(trans.getvalue()).to.equal(value.toString('base64'));

    // making sure getvalue did not consume the content
    expect(trans.getvalue()).to.equal(value.toString('base64'));
  }

  beforeEach(() => {
    this.rawPayload = Buffer.from('1234', 'utf-8');
    this.payload = this.rawPayload.toString('base64');
    this.callback = sinon.spy();
  });

  it('read empty initial', () => {
    let trans = new TLambdaServerTransport(Buffer.alloc(0), this.callback);
    assertTransReadEmpty(trans);
  });

  it('read decode initial value', () => {
    let trans = new TLambdaServerTransport(this.payload, this.callback);
    assertTransReadContent(trans, this.rawPayload)
  });

  it('read write with flush', async () => {
    let trans = new TLambdaServerTransport(Buffer.alloc(0), this.callback);
    trans.write(this.rawPayload);
    await trans.flush();
    assertTransReadContent(trans, this.rawPayload);
  });

  it('getvalue empty initial', () => {
    let trans = new TLambdaServerTransport(Buffer.alloc(0), this.callback);
    assertTransGVEmpty(trans);
  });

  it('getvalue decode initial value', () => {
    let trans = new TLambdaServerTransport(this.payload, this.callback);
    assertTransGVContent(trans, this.rawPayload)
  });

  it('getvalue write no flush', () => {
    let trans = new TLambdaServerTransport(Buffer.alloc(0), this.callback);
    trans.write(this.rawPayload);
    assertTransGVEmpty(trans);
  });

  it('getvalue write with flush', async () => {
    let trans = new TLambdaServerTransport(Buffer.alloc(0), this.callback);
    trans.write(this.rawPayload);
    await trans.flush();
    assertTransGVContent(trans, this.payload);
  });
});
