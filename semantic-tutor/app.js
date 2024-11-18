import { Stack } from './immutable.js';

import { genTags, patch } from "./dom.js";
import { LOCAL } from './names.js';
import { Env, Scope, Frame } from './names.js';
import { VM, push, bind, rebind, find, enter, nop } from './namevm.js';

const { div, span, code, button, img } = genTags;

function f() { }

function main() {
  const rootNode = document.getElementById("app"),
    render = (vdom) => patch(rootNode, vdom);

  const root = new VMView();

  function handleClick(e) {
    const { action } = e.target?.dataset;

    if (action === undefined) {
      return;
    }

    switch (action) {
      default:
        console.warn("unknown action", action);
    }

    render(root.toDOM());
  }

  function handleKey(e) {
    switch (e.key) {
      case "ArrowLeft":
        root.prev();
        break;
      case "ArrowRight":
        root.next();
        break;
      default:
        return;
    }

    render(root.toDOM());
  }

  rootNode.addEventListener("click", handleClick);
  document.body.addEventListener("keyup", handleKey);

  render(root.toDOM());
}

Frame.prototype.toDOM = function() {
  const len = this.binds.size,
    items = new Array(len * 2);

  let i = 0;
  for (const [key, val] of this.binds) {
    items[i] = span("bind-key", key);
    items[i + 1] = span("bind-val", val);
    i += 2;
  }

  return div("frame",
    span("frame-name", this.name),
    div("binds", ...items));
};

Scope.prototype.toDOM = function() {
  const len = this.frames.size,
    items = new Array(len);

  for (let i = 0; i < len; i++) {
    items[i] = this.frames.get(i).toDOM();
  }

  return div("scope", ...items);
};

Env.prototype.toDOM = function() {
  const len = this.scopes.size,
    items = new Array(len);

  let i = 0;
  for (const [_key, val] of this.scopes) {
    items[i] = val.toDOM();
    i += 1;
  }

  return div("env", ...items);
};

Stack.prototype.toDOM = function() {
  return "stack";
};

VM.prototype.toDOM = function() {
  return div("vm", this.env.toDOM(), this.stack.toDOM());
}

class VMView {
  constructor() {
    this.vm = new VM().enterAt(LOCAL);
    this.pc = 0;

    const k1 = "k1",
      v1 = 42,
      v2 = 123;
    this.code = [push(v1), bind(k1), enter("myscope"), push(v2), rebind(k1), find(k1)];
  }
  toDOM() {
    return div("vmview", this.vm.toDOM());
  }
  next() {
    this.vm = this.code[this.pc].exec(this.vm);
    this.pc += 1;
  }
  prev() { console.log("prev"); }
}

main();
