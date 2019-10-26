/* eslint-disable no-bitwise */
import sinon from 'sinon';
import { expect } from 'chai';
import { TLambdaServerTransport, TransportClosedError } from '../lib/index';
import { TTransformTransport } from '../lib/lambda_transport';

export function assertTransReadEmpty(trans) {
  expect(Buffer.compare(trans.read(1), Buffer.alloc(0))).to.equal(0);
}

export function assertTransReadContent(trans, value) {
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
    this.payload = Buffer.from('1234', 'utf-8');
  });

  it('close sanity', () => {
    const trans = new TTransformTransport();
    trans.close();
    expect(() => trans.write('1')).to.throw(TransportClosedError);
    expect(() => trans.read()).to.throw(TransportClosedError);
  });

  it('open sanity', () => {
    const trans = new TTransformTransport();
    trans.close();
    trans.open();
    expect(() => trans.write('1')).to.not.throw();
    expect(() => trans.read()).to.not.throw();
  });

  it('isOpen sanity', () => {
    const trans = new TTransformTransport();
    expect(trans.isOpen()).to.be.true;
    trans.close();
    expect(trans.isOpen()).to.be.false;
    trans.open();
    expect(trans.isOpen()).to.be.true;
  });

  it('read empty', () => {
    const trans = new TTransformTransport();
    assertTransReadEmpty(trans);
  });

  it('read initial value buffer', () => {
    const trans = new TTransformTransport(this.payload);
    assertTransReadContent(trans, this.payload);
  });

  it('read initial value string', () => {
    const trans = new TTransformTransport(this.payload.toString('utf-8'));
    assertTransReadContent(trans, this.payload);
  });

  it('write no flush buffer', () => {
    const trans = new TTransformTransport();
    trans.write(this.payload);
    assertTransReadEmpty(trans);
  });

  it('write no flush string', () => {
    const trans = new TTransformTransport();
    trans.write(this.payload.toString('utf-8'));
    assertTransReadEmpty(trans);
  });

  it('write flush read buffer', async () => {
    const trans = new TTransformTransport();
    trans.write(this.payload);
    await trans.flush();
    assertTransReadContent(trans, this.payload);
  });

  it('write flush read string', async () => {
    const trans = new TTransformTransport();
    trans.write(this.payload.toString('utf-8'));
    await trans.flush();
    assertTransReadContent(trans, this.payload);
  });

  it('write flush empty', async () => {
    const trans = new TTransformTransport();
    await trans.flush();
    assertTransReadEmpty(trans);
    assertTransGVEmpty(trans);
  });

  it('getvalue empty', () => {
    const trans = new TTransformTransport();
    assertTransGVEmpty(trans);
  });

  it('getvalue initial value buffer', () => {
    const trans = new TTransformTransport(this.payload);
    assertTransGVContent(trans, this.payload);
  });

  it('getvalue initial value string', () => {
    const trans = new TTransformTransport(this.payload.toString('utf-8'));
    assertTransGVContent(trans, this.payload);
  });

  it('getvalue write no flush buffer', () => {
    const trans = new TTransformTransport();
    trans.write(this.payload);
    assertTransGVEmpty(trans);
  });

  it('getvalue write no flush string', () => {
    const trans = new TTransformTransport();
    trans.write(this.payload.toString('utf-8'));
    assertTransGVEmpty(trans);
  });

  it('write flush getvalue buffer', async () => {
    const trans = new TTransformTransport();
    trans.write(this.payload);
    await trans.flush();
    assertTransGVContent(trans, this.payload);
  });

  it('write flush getvalue string', async () => {
    const trans = new TTransformTransport();
    trans.write(this.payload.toString('utf-8'));
    await trans.flush();
    assertTransGVContent(trans, this.payload);
  });

  it('readByte sanity', () => {
    const byte = 124;
    const trans = new TTransformTransport(Buffer.of(byte));
    expect(trans.readByte()).to.equal(byte);
  });

  it('readByte negative', () => {
    const byte = -125;
    const trans = new TTransformTransport(Buffer.of(byte));
    expect(trans.readByte()).to.equal(byte);
  });

  it('readI16 sanity', () => {
    const int = 0x1234;
    const trans = new TTransformTransport(Buffer.of((int >> 8) & 0xff, int & 0xff));
    expect(trans.readI16()).to.equal(int);
  });

  it('readI16 negative', () => {
    const int = -0x1234;
    const trans = new TTransformTransport(Buffer.of((int >> 8) & 0xff, int & 0xff));
    expect(trans.readI16()).to.equal(int);
  });

  it('readI32 sanity', () => {
    const int = 0x12345678;
    const trans = new TTransformTransport(Buffer.of(
      (int >> 24) & 0xff,
      (int >> 16) & 0xff,
      (int >> 8) & 0xff,
      int & 0xff
    ));
    expect(trans.readI32()).to.equal(int);
  });

  it('readI32 negative', () => {
    const int = -0x12345678;
    const trans = new TTransformTransport(Buffer.of(
      (int >> 24) & 0xff,
      (int >> 16) & 0xff,
      (int >> 8) & 0xff,
      int & 0xff
    ));
    expect(trans.readI32()).to.equal(int);
  });

  it('readDouble sanity', () => {
    const double = 1234.1234;
    const buf = Buffer.alloc(8);
    buf.writeDoubleBE(double);
    const trans = new TTransformTransport(buf);
    expect(trans.readDouble()).to.equal(double);
  });

  it('readDouble negative', () => {
    const double = -1234.1234;
    const buf = Buffer.alloc(8);
    buf.writeDoubleBE(double);
    const trans = new TTransformTransport(buf);
    expect(trans.readDouble()).to.equal(double);
  });

  it('readString sanity', () => {
    const str = '12341234';
    const trans = new TTransformTransport(Buffer.from(str, 'utf-8'));
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
    const trans = new TLambdaServerTransport(Buffer.alloc(0), this.callback);
    assertTransReadEmpty(trans);
  });

  it('read decode initial value', () => {
    const trans = new TLambdaServerTransport(this.payload, this.callback);
    assertTransReadContent(trans, this.rawPayload);
  });

  it('read write with flush', async () => {
    const trans = new TLambdaServerTransport(Buffer.alloc(0), this.callback);
    trans.write(this.rawPayload);
    await trans.flush();
    assertTransReadContent(trans, this.rawPayload);
  });

  it('getvalue empty initial', () => {
    const trans = new TLambdaServerTransport(Buffer.alloc(0), this.callback);
    assertTransGVEmpty(trans);
  });

  it('getvalue decode initial value', () => {
    const trans = new TLambdaServerTransport(this.payload, this.callback);
    assertTransGVContent(trans, this.rawPayload);
  });

  it('getvalue write no flush', () => {
    const trans = new TLambdaServerTransport(Buffer.alloc(0), this.callback);
    trans.write(this.rawPayload);
    assertTransGVEmpty(trans);
  });

  it('getvalue write with flush', async () => {
    const trans = new TLambdaServerTransport(Buffer.alloc(0), this.callback);
    trans.write(this.rawPayload);
    await trans.flush();
    assertTransGVContent(trans, this.payload);
  });
});
