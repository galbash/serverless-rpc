const serverlessThrift = require("serverless-thrift")
const Calculator = require("./gen-nodejs/Calculator");
const ttypes = require("./gen-nodejs/tutorial_types");
const SharedStruct = require("./gen-nodejs/shared_types").SharedStruct;

const data = {};

const server = serverlessThrift.createLambdaServer(Calculator, {
  ping: async function() {
    console.log("ping()");
    return null;
  },

  add: async function(n1, n2) {
    console.log("add(", n1, ",", n2, ")");
    return n1 + n2;
  },

  calculate: async function(logid, work) {
    console.log("calculate(", logid, ",", work, ")");

    var val = 0;
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

    var entry = new SharedStruct();
    entry.key = logid;
    entry.value = ""+val;
    data[logid] = entry;

    return val;
  },

  getStruct: async function(key) {
    console.log("getStruct(", key, ")");
    return data[key];
  },

  zip: async function() {
    console.log("zip()");
  }

});

module.exports.handle = server.handle.bind(server);
