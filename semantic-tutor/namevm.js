import { Env, LOCAL, NOT_SET } from "./names.js";
import { Stack, Record } from "./immutable.js";

export class VM extends Record({ env: Env.withLocal(), stack: new Stack() }) {
  constructor() {
    super();
  }

  peek() {
    return this.stack.first();
  }

  pop() {
    return this.set("stack", this.stack.rest());
  }

  push(v) {
    return this.set("stack", this.stack.push(v));
  }

  doToEnv(fn) {
    return this.update("env", fn);
  }

  onNameNotFound(key, name) {
    throw new Error(`Name '${name} not found at '${key}'`);
  }

  findAt(key, name) {
    const v = this.env.findAt(key, name, NOT_SET);
    if (v === NOT_SET) {
      return this.onNameNotFound(key, name);
    } else {
      return this.push(v);
    }
  }
  enterAt(key, name, binds) {
    return this.doToEnv((env) => env.enterAt(key, name, binds));
  }

  bindAt(key, name, value) {
    return this.doToEnv((env) => env.bindAt(key, name, value));
  }

  rebindAt(key, name, value) {
    return this.doToEnv((envIn) => {
      const { env } = envIn.rebindAt(key, name, value);
      return env;
    });
  }
}

class Instr {
  exec(env) {
    return env;
  }
}

export class Nop extends Instr {
  toString() {
    return "Nop";
  }
}

export class Push extends Instr {
  constructor(value) {
    super();
    this.value = value;
  }

  exec(vm) {
    return vm.push(this.value);
  }

  toString() {
    return `Push(${this.value})`;
  }
}

export class Pop extends Instr {
  constructor() {
    super();
  }

  exec(vm) {
    return vm.pop();
  }

  toString() {
    return `Pop`;
  }
}

export class FindAt extends Instr {
  constructor(key, name) {
    super();
    this.key = key;
    this.name = name;
  }

  exec(vm) {
    return vm.findAt(this.key, this.name);
  }

  toString() {
    return `FindAt(${this.key}, ${this.name})`;
  }
}

export class Find extends FindAt {
  constructor(name) {
    super(LOCAL, name);
  }

  toString() {
    return `Find(${this.name})`;
  }
}

export class EnterAt extends Instr {
  constructor(key, name) {
    super();
    this.key = key;
    this.name = name;
  }

  exec(vm) {
    return vm.enterAt(this.key, this.name, {});
  }

  toString() {
    return `EnterAt(${this.key}, ${this.name})`;
  }
}

export class Enter extends EnterAt {
  constructor(name) {
    super(LOCAL, name);
  }

  toString() {
    return `Enter(${this.name})`;
  }
}

export class BindAt extends Instr {
  constructor(key, name) {
    super();
    this.key = key;
    this.name = name;
  }

  exec(vm) {
    return vm.bindAt(this.key, this.name, vm.peek()).pop();
  }

  toString() {
    return `BindAt(${this.key}, ${this.name})`;
  }
}

export class Bind extends BindAt {
  constructor(name) {
    super(LOCAL, name);
  }

  toString() {
    return `Bind(${this.name})`;
  }
}

export class RebindAt extends Instr {
  constructor(key, name) {
    super();
    this.key = key;
    this.name = name;
  }

  exec(vm) {
    return vm.rebindAt(this.key, this.name, vm.peek()).pop();
  }

  toString() {
    return `RebindAt(${this.key}, ${this.name})`;
  }
}

export class Rebind extends RebindAt {
  constructor(name) {
    super(LOCAL, name);
  }

  toString() {
    return `Rebind(${this.name})`;
  }
}

class UnOp extends Instr {
  exec(vm) {
    const a = vm.peek();
    vm = vm.pop();
    return vm.push(this.applyOp(a));
  }

  applyOp(_a) {
    throw new Error("Not Implemented");
  }

  toString() {
    return `UnOp`;
  }
}
export class Not extends UnOp {
  applyOp(a) {
    return !a;
  }

  toString() {
    return `Not`;
  }
}
export class Neg extends UnOp {
  applyOp(a) {
    return -a;
  }

  toString() {
    return `Neg`;
  }
}

class BinOp extends Instr {
  exec(vm) {
    const a = vm.peek();
    vm = vm.pop();
    const b = vm.peek();
    vm = vm.pop();
    return vm.push(this.applyOp(a, b));
  }

  applyOp(_a, _b) {
    throw new Error("Not Implemented");
  }

  toString() {
    return `BinOp`;
  }
}

export class Add extends BinOp {
  applyOp(a, b) {
    return a + b;
  }

  toString() {
    return `Add`;
  }
}
export class Sub extends BinOp {
  applyOp(a, b) {
    return a - b;
  }

  toString() {
    return `Sub`;
  }
}
export class Mul extends BinOp {
  applyOp(a, b) {
    return a * b;
  }

  toString() {
    return `Mul`;
  }
}
export class Div extends BinOp {
  applyOp(a, b) {
    return a / b;
  }

  toString() {
    return `Div`;
  }
}
export class Eq extends BinOp {
  applyOp(a, b) {
    return a === b;
  }

  toString() {
    return `Eq`;
  }
}
export class NotEq extends BinOp {
  applyOp(a, b) {
    return a !== b;
  }

  toString() {
    return `NotEq`;
  }
}
export class Gt extends BinOp {
  applyOp(a, b) {
    return a > b;
  }

  toString() {
    return `Gt`;
  }
}
export class Ge extends BinOp {
  applyOp(a, b) {
    return a >= b;
  }

  toString() {
    return `Ge`;
  }
}
export class Lt extends BinOp {
  applyOp(a, b) {
    return a < b;
  }

  toString() {
    return `Lt`;
  }
}
export class Le extends BinOp {
  applyOp(a, b) {
    return a <= b;
  }

  toString() {
    return `Le`;
  }
}
export class And extends BinOp {
  applyOp(a, b) {
    return a && b;
  }

  toString() {
    return `And`;
  }
}
export class Or extends BinOp {
  applyOp(a, b) {
    return a || b;
  }

  toString() {
    return `Or`;
  }
}

export function nop() {
  return new Nop();
}

export function push(value) {
  return new Push(value);
}

export function pop() {
  return new Pop();
}

export function findAt(key, name) {
  return new FindAt(key, name);
}

export function find(name) {
  return new Find(name);
}

export function enterAt(key, name) {
  return new EnterAt(key, name);
}

export function enter(name) {
  return new Enter(name);
}

export function bindAt(key, name) {
  return new BindAt(key, name);
}

export function bind(name) {
  return new Bind(name);
}

export function rebindAt(key, name) {
  return new RebindAt(key, name);
}

export function rebind(name) {
  return new Rebind(name);
}

export function add() {
  return new Add();
}
export function sub() {
  return new Sub();
}
export function mul() {
  return new Mul();
}
export function div() {
  return new Div();
}
export function eq() {
  return new Eq();
}
export function notEq() {
  return new NotEq();
}
export function gt() {
  return new Gt();
}
export function ge() {
  return new Ge();
}
export function lt() {
  return new Lt();
}
export function le() {
  return new Le();
}

export function and() {
  return new And();
}
export function or() {
  return new Or();
}

export function not() {
  return new Not();
}
export function neg() {
  return new Neg();
}
