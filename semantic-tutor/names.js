import { Record, OrderedMap as OMap, Stack } from "./immutable.js";

export const NOT_SET = {};

export class Frame extends Record({ name: "<frame>", binds: OMap() }) {
  constructor(name, binds) {
    super({ name, binds: OMap(binds) });
  }

  bind(name, value) {
    return this.set("binds", this.binds.set(name, value));
  }

  hasName(name) {
    return this.find(name, NOT_SET) !== NOT_SET;
  }

  find(name, dval = null) {
    return this.binds.get(name, dval);
  }
}

export class Scope extends Record({ frames: Stack() }) {
  constructor(frames = []) {
    super({ frames: new Stack(frames) });
  }

  static withFrame(name, binds) {
    return new Scope([new Frame(name, binds)]);
  }

  withFrames(frames) {
    return this.set("frames", Stack.isStack(frames) ? frames : new Stack(frames));
  }

  enter(name, binds) {
    return this.update("frames", f => f.push(new Frame(name, binds)));
  }

  bind(name, value) {
    const h = this.frames.first(),
      t = this.frames.rest();
    return this.withFrames(t.push(h.bind(name, value)));
  }

  rebind(name, value) {
    const i = this.frames.findIndex(f => f.hasName(name)),
      found = i !== -1;

    if (found) {
      const arr = this.frames.toArray();
      arr[i] = arr[i].bind(name, value);
      return { i, found, scope: this.withFrames(arr) };
    }

    return { i, found, scope: this };
  }

  find(name, dval = null) {
    for (const frame of this.frames) {
      const v = frame.find(name, NOT_SET);

      if (v !== NOT_SET) {
        return v;
      }
    }

    return dval;
  }
}

export const LOCAL = "local";

export class Env extends Record({ scopes: new OMap() }) {
  constructor() {
    super();
  }

  static withLocal(fn) {
    return new Env().addScope(LOCAL, fn);
  }

  get local() {
    return this.scopes.get(LOCAL, null);
  }

  addScope(key, fn) {
    const scope = new Scope();
    return this.setIn(["scopes", key], fn ? fn(scope) : scope);
  }

  enter(name, binds) {
    return this.enterAt(LOCAL, name, binds);
  }

  bind(name, value) {
    return this.bindAt(LOCAL, name, value);
  }

  rebind(name, value) {
    return this.rebindAt(LOCAL, name, value);
  }

  find(name, dval = null) {
    return this.findAt(LOCAL, name, dval);
  }

  doTo(key, fn) {
    return this.set("scopes", this.scopes.update(key, fn));
  }

  enterAt(key, name, binds) {
    return this.doTo(key, s => s.enter(name, binds));
  }

  bindAt(key, name, value) {
    return this.doTo(key, s => s.bind(name, value));
  }

  rebindAt(key, name, value) {
    const s = this.scopes.get(key),
      { i, found, scope } = s.rebind(name, value);

    return { i, found, env: found ? this.setIn(["scopes", key], scope) : this };
  }

  findAt(key, name, dval = null) {
    return this.scopes.get(key).find(name, dval);
  }
}