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
    return this.doToEnv(env => env.enterAt(key, name, binds));
  }

  bindAt(key, name, value) {
    return this.doToEnv(env => env.bindAt(key, name, value));
  }

  rebindAt(key, name, value) {
    return this.doToEnv(envIn => {
      const {env} = envIn.rebindAt(key, name, value);
      return env;
    });
  }
}

class Instr {
  exec(env) {
    return env;
  }
}

class Nop extends Instr {
  toString() {
    return "Nop";
  }
}

class Push extends Instr {
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

class FindAt extends Instr {
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

class Find extends FindAt {
  constructor(name) {
    super(LOCAL, name);
  }

  toString() {
    return `Find(${this.name})`;
  }
}

class EnterAt extends Instr {
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

class Enter extends EnterAt {
  constructor(name) {
    super(LOCAL, name);
  }

  toString() {
    return `Enter(${this.name})`;
  }
}

class BindAt extends Instr {
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

class Bind extends BindAt {
  constructor(name) {
    super(LOCAL, name);
  }

  toString() {
    return `Bind(${this.name})`;
  }
}

class RebindAt extends Instr {
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

class Rebind extends RebindAt {
  constructor(name) {
    super(LOCAL, name);
  }

  toString() {
    return `Rebind(${this.name})`;
  }
}

export function nop() {
  return new Nop();
}

export function push(value) {
  return new Push(value);
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
