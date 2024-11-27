import {
  Record,
  OrderedMap as OMap,
  Map as IMap,
  Stack,
  List,
} from "./immutable.js";

export const NOT_SET = {};

export class FrameMeta extends Record({
  title: null,
  notes: List(),
  binds: OMap(),
}) {
  setTitle(v) {
    return this.set("title", v);
  }

  addNote(v) {
    return this.set("notes", this.notes.push(v));
  }

  bind(key, value) {
    return this.setIn(["binds", key], value);
  }
}

export class Frame extends Record({
  name: "<frame>",
  binds: OMap(),
  meta: new FrameMeta(),
}) {
  constructor(name, binds) {
    super({ name, binds: OMap(binds) });
  }

  get title() {
    return this.meta.title ?? this.name;
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

  doToMeta(fn) {
    return this.set("meta", fn(this.meta));
  }

  setTitle(v) {
    return this.doToMeta((m) => m.setTitle(v));
  }

  addNote(v) {
    return this.doToMeta((m) => m.addNote(v));
  }

  bindMeta(key, value) {
    return this.doToMeta((m) => m.bind(key, value));
  }
}

export class Scope extends Record({ name: "Scope", frames: Stack() }) {
  constructor(name, frames = []) {
    super({ name, frames: new Stack(frames) });
  }

  withFrames(frames) {
    return this.set(
      "frames",
      Stack.isStack(frames) ? frames : new Stack(frames),
    );
  }

  enter(name, binds) {
    return this.update("frames", (f) => f.push(new Frame(name, binds)));
  }

  leave() {
    return this.update("frames", (f) => f.pop());
  }

  updateFirstFrame(fn) {
    const h = this.frames.first(),
      t = this.frames.rest();
    return this.withFrames(t.push(fn(h)));
  }

  bind(name, value) {
    return this.updateFirstFrame((h) => h.bind(name, value));
  }

  rebind(name, value) {
    const i = this.frames.findIndex((f) => f.hasName(name)),
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

  doToMeta(fn) {
    return this.updateFirstFrame((h) => fn(h));
  }

  setTitle(v) {
    return this.doToMeta((m) => m.setTitle(v));
  }

  addNote(v) {
    return this.doToMeta((m) => m.addNote(v));
  }

  bindMeta(key, value) {
    return this.doToMeta((m) => m.bind(key, value));
  }
}

export const LOCAL = "local";

export const DATA = "data";

export class Env extends Record({
  curScopeKey: LOCAL,
  curStackKey: DATA,
  scopes: new OMap(),
  stacks: new OMap(),
  props: new IMap(),
}) {
  // scope

  addLocalScope(fn) {
    return this.addScope(LOCAL, fn);
  }

  setCurScopeKey(v) {
    return this.set("curScopeKey", v);
  }

  get currentScope() {
    return this.scopes.get(this.curScopeKey);
  }

  addScope(key, fn) {
    const scope = new Scope(key);
    return this.setIn(["scopes", key], fn ? fn(scope) : scope);
  }

  enter(name, binds) {
    return this.enterAt(this.curScopeKey, name, binds);
  }

  leave() {
    return this.leaveAt(this.curScopeKey);
  }

  bind(name, value) {
    return this.bindAt(this.curScopeKey, name, value);
  }

  rebind(name, value) {
    return this.rebindAt(this.curScopeKey, name, value);
  }

  find(name, dval = null) {
    return this.findAt(this.curScopeKey, name, dval);
  }

  doTo(key, fn) {
    return this.set("scopes", this.scopes.update(key, fn));
  }

  enterAt(key, name, binds) {
    return this.doTo(key, (s) => s.enter(name, binds));
  }

  leaveAt(key) {
    return this.doTo(key, (s) => s.leave());
  }

  bindAt(key, name, value) {
    return this.doTo(key, (s) => s.bind(name, value));
  }

  rebindAt(key, name, value) {
    const s = this.scopes.get(key),
      { i, found, scope } = s.rebind(name, value);

    return { i, found, env: found ? this.setIn(["scopes", key], scope) : this };
  }

  findAt(key, name, dval = null) {
    return this.scopes.get(key).find(name, dval);
  }

  // scope meta

  setTitle(v) {
    return this.setTitleAt(this.curScopeKey, v);
  }

  addNote(v) {
    return this.addNoteAt(this.curScopeKey, v);
  }

  bindMeta(key, value) {
    return this.bindMetaAt(this.curScopeKey, key, value);
  }

  setTitleAt(key, v) {
    return this.doTo(key, (m) => m.setTitle(v));
  }

  addNoteAt(key, v) {
    return this.doTo(key, (m) => m.addNote(v));
  }

  bindMetaAt(key, metaKey, value) {
    return this.doTo(key, (m) => m.bindMeta(metaKey, value));
  }

  // stack

  addDataStack(fn) {
    return this.addStack(DATA, fn);
  }

  addStack(key, fn) {
    const stack = new Stack();
    return this.setIn(["stacks", key], fn ? fn(stack) : stack);
  }

  setCurStackKey(key) {
    return this.set("curStackKey", key);
  }

  doToStack(key, fn) {
    return this.set("stacks", this.stacks.update(key, fn));
  }

  push(value) {
    return this.pushAt(this.curStackKey, value);
  }

  pop() {
    return this.popAt(this.curStackKey);
  }

  peek(dval = null) {
    return this.peekAt(this.curStackKey, dval);
  }

  pushAt(key, value) {
    return this.doToStack(key, (s) => s.push(value));
  }

  popAt(key) {
    return this.doToStack(key, (s) => s.pop());
  }

  peekAt(key, dval = null) {
    const stack = this.stacks.get(key);
    return stack.size > 0 ? stack.peek() : dval;
  }

  //

  setProp(key, val) {
    return this.setIn(["props", key], val);
  }

  getProp(key, dval) {
    return this.props.get(key, dval);
  }
}
