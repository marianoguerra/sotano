import { Stack } from "./immutable.js";

import { genTags, patch } from "./dom.js";
import { LOCAL } from "./names.js";
import { Env, Scope, Frame } from "./names.js";
import {
  VM,
  push,
  bind,
  rebind,
  find,
  enter,
  nop,
  Nop,
  Push,
  FindAt,
  Find,
  EnterAt,
  Enter,
  BindAt,
  Bind,
  RebindAt,
  Rebind,
} from "./namevm.js";

const { div, span, code, button, img } = genTags;

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

Frame.prototype.toDOM = function () {
  const len = this.binds.size,
    items = new Array(len * 2);

  let i = 0;
  for (const [key, val] of this.binds) {
    items[i] = span("bind-key", key);
    items[i + 1] = div("bind-val", rValue(val));
    i += 2;
  }

  return div("frame", span("frame-name", this.name), div("binds", ...items));
};

Scope.prototype.toDOM = function () {
  const len = this.frames.size,
    items = new Array(len * 2 - 1);

  for (let i = 0, j = 0; j < len; j++) {
    if (i > 0) {
      items[i] = div("frame-link", "⬆️");
      i += 1;
    }

    items[i] = this.frames.get(j).toDOM();
    i += 1;
  }

  return div("scope", ...items);
};

Env.prototype.toDOM = function () {
  const len = this.scopes.size,
    items = new Array(len);

  let i = 0;
  for (const [_key, val] of this.scopes) {
    items[i] = val.toDOM();
    i += 1;
  }

  return div("env", ...items);
};

Stack.prototype.toDOM = function () {
  const len = this.size,
    items = new Array(len);

  for (let i = 0; i < len; i++) {
    items[i] = rValue(this.get(i));
  }

  return div("stack", span("stack-title", "Stack"), ...items);
};

VM.prototype.toDOM = function () {
  return div("vm", this.env.toDOM(), this.stack.toDOM());
};

Nop.prototype.toDOM = function () {
  return div("instr instr-nop", span("op-name", "Nop"));
};
Push.prototype.toDOM = function () {
  return div("instr instr-push", span("op-name", "Push"), rValue(this.value));
};
FindAt.prototype.toDOM = function () {
  return div(
    "instr instr-findat",
    span("op-name", "FindAt", rValue(this.key), rValue(this.name)),
  );
};
Find.prototype.toDOM = function () {
  return div("instr instr-find", span("op-name", "Find"), rValue(this.name));
};
EnterAt.prototype.toDOM = function () {
  return div(
    "instr instr-enterat",
    span("op-name", "EnterAt", rValue(this.key), rValue(this.name)),
  );
};
Enter.prototype.toDOM = function () {
  return div("instr instr-enter", span("op-name", "Enter"), rValue(this.name));
};
BindAt.prototype.toDOM = function () {
  return div(
    "instr instr-bindat",
    span("op-name", "BindAt", rValue(this.key), rValue(this.name)),
  );
};
Bind.prototype.toDOM = function () {
  return div("instr instr-bind", span("op-name", "Bind"), rValue(this.name));
};
RebindAt.prototype.toDOM = function () {
  return div(
    "instr instr-rebindat",
    span("op-name", "RebindAt", rValue(this.key), rValue(this.name)),
  );
};
Rebind.prototype.toDOM = function () {
  return div(
    "instr instr-rebind",
    span("op-name", "Rebind"),
    rValue(this.name),
  );
};

function rValue(v) {
  switch (typeof v) {
    case "string":
      return span("val val-str", v);
    case "number":
    case "bigint":
      return span("val val-num", v);

    case "boolean":
      return span("val val-bool", v);
    case "function":
      return span("val val-fn", "λ");
    case "symbol":
      return span("val val-bad", v.toString());
    default:
      return v == null
        ? span("val val-null", "null")
        : Array.isArray(v)
          ? span("val val-array", "[…]")
          : span("val val-obj", "{…}");
  }
}

class VMView {
  constructor() {
    this.vm = new VM().enterAt(LOCAL);
    this.pc = 0;

    const k1 = "k1",
      v1 = 42,
      v2 = 123;
    this.code = [
      push(v1),
      bind(k1),
      enter("myscope"),
      push(v2),
      rebind(k1),
      find(k1),
    ];
  }
  toDOM() {
    return div("vmview", this._codeToDOM(), this.vm.toDOM());
  }
  _codeToDOM() {
    const instrs = new Array(this.code.length);
    for (let i = 0; i < this.code.length; i++) {
      instrs[i] = div(
        this.pc === i ? "instr-box active" : "instr-box",
        this.code[i].toDOM(),
      );
    }
    return div("code", ...instrs);
  }
  next() {
    this.vm = this.code[this.pc].exec(this.vm);
    this.pc += 1;
  }
  prev() {
    console.log("prev");
  }
}

main();
