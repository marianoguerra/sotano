import { Env, LOCAL, NOT_SET } from "./names.js";
import { Record } from "./immutable.js";

export class VM extends Record({
  env: new Env().addLocalScope().addDataStack(),
}) {
  setCurrentStack(key) {
    return this.doToEnv((env) => env.setCurStackKey(key));
  }

  peek() {
    return this.env.peek();
  }

  pop() {
    return this.doToEnv((env) => env.pop());
  }

  push(value) {
    return this.doToEnv((env) => env.push(value));
  }

  peekAt(key) {
    return this.env.peek(key);
  }

  popAt(key) {
    return this.doToEnv((env) => env.popAt(key));
  }

  pushAt(key, value) {
    return this.doToEnv((env) => env.pushAt(key, value));
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

  leaveAt(key) {
    return this.doToEnv((env) => env.leaveAt(key));
  }

  setCurrentScope(key) {
    return this.doToEnv((env) => env.setCurScopeKey(key));
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

  setTitle(v) {
    return this.doToEnv((env) => env.setTitle(v));
  }

  addNote(v) {
    return this.doToEnv((env) => env.addNote(v));
  }

  setProp(k, v) {
    return this.doToEnv((env) => env.setProp(k, v));
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

export class SetCurrentStack extends Instr {
  constructor(key) {
    super();
    this.key = key;
  }

  exec(vm) {
    return vm.setCurrentStack(this.key);
  }

  toString() {
    return `SetCurrentStack(${this.key})`;
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

export class LeaveAt extends Instr {
  constructor(key) {
    super();
    this.key = key;
  }

  exec(vm) {
    return vm.leaveAt(this.key);
  }

  toString() {
    return `LeaveAt(${this.key})`;
  }
}

export class Leave extends LeaveAt {
  constructor() {
    super(LOCAL);
  }

  toString() {
    return `Leave`;
  }
}

export class SetCurrentScope extends Instr {
  constructor(key) {
    super();
    this.key = key;
  }

  exec(vm) {
    return vm.setCurrentScope(this.key);
  }

  toString() {
    return `SetCurrentScope(${this.key})`;
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

class UnVmOp extends Instr {
  exec(vm) {
    const a = vm.peek();
    return this.applyOp(vm.pop(), a);
  }

  applyOp(_vm, _a) {
    throw new Error("Not Implemented");
  }

  toString() {
    return `UnVmOp`;
  }
}
export class SetFrameTitle extends UnVmOp {
  applyOp(vm, a) {
    return vm.setTitle(a);
  }

  toString() {
    return `SetFrameTitle`;
  }
}
export class AddFrameNote extends UnVmOp {
  applyOp(vm, a) {
    return vm.addNote(a);
  }

  toString() {
    return `AddFrameNote`;
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

export class SetProp extends Instr {
  constructor(key, value) {
    super();
    this.key = key;
    this.value = value;
  }

  exec(vm) {
    return vm.setProp(this.key, this.value);
  }

  toString() {
    return `SetProp(${this.key}, ${this.value})`;
  }
}

export function nop() {
  return new Nop();
}

export function setCurrentStack(key) {
  return new SetCurrentStack(key);
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

export function leaveAt(key) {
  return new LeaveAt(key);
}

export function leave() {
  return new Leave();
}

export function setCurrentScope(key) {
  return new SetCurrentScope(key);
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
export function ne() {
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

export function setFrameTitle() {
  return new SetFrameTitle();
}

export function addFrameNote() {
  return new AddFrameNote();
}

export function setProp(k, v) {
  return new SetProp(k, v);
}
