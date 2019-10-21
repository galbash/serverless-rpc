const ttypes = require('./gen-nodejs/tutorial_types');
const SharedStruct = require('./gen-nodejs/shared_types').SharedStruct;

const data = {};

module.exports.handler = {
  async ping() {
    console.log('ping()');
    return null;
  },

  async add(n1, n2) {
    console.log('add(', n1, ',', n2, ')');
    return n1 + n2;
  },

  async calculate(logid, work) {
    console.log('calculate(', logid, ',', work, ')');

    let val = 0;
    if (work.op == ttypes.Operation.ADD) {
      val = work.num1 + work.num2;
    } else if (work.op === ttypes.Operation.SUBTRACT) {
      val = work.num1 - work.num2;
    } else if (work.op === ttypes.Operation.MULTIPLY) {
      val = work.num1 * work.num2;
    } else if (work.op === ttypes.Operation.DIVIDE) {
      if (work.num2 === 0) {
        var x = new ttypes.InvalidOperation();
        x.whatOp = work.op;
        x.why = 'Cannot divide by 0';
        throw x;
      }
      val = work.num1 / work.num2;
    } else {
      var x = new ttypes.InvalidOperation();
      x.whatOp = work.op;
      x.why = 'Invalid operation';
      throw x;
    }

    const entry = new SharedStruct();
    entry.key = logid;
    entry.value = `${val}`;
    data[logid] = entry;

    return val;
  },

  async getStruct(key) {
    console.log('getStruct(', key, ')');
    return data[key];
  },

  async zip() {
    console.log('zip()');
  },

};
