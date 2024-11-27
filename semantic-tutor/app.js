import { Stack } from "./immutable.js";
import * as monaco from "./deps/monaco-editor.js";

import { genTags, patch } from "./dom.js";
import { LOCAL } from "./names.js";
import { Env, Scope, Frame } from "./names.js";
import {
  VM,
  push,
  pop,
  bind,
  rebind,
  find,
  enter,
  leave,
  leaveAt,
  nop,
  Nop,
  Push,
  Pop,
  FindAt,
  Find,
  EnterAt,
  Enter,
  LeaveAt,
  Leave,
  BindAt,
  Bind,
  RebindAt,
  Rebind,
  add,
  Add,
  Sub,
  mul,
  Mul,
  Div,
  eq,
  Eq,
  NotEq,
  Gt,
  Ge,
  Lt,
  Le,
  And,
  Or,
  Not,
  not,
  Neg,
  neg,
  SetFrameTitle,
  setFrameTitle,
  AddFrameNote,
  addFrameNote,
  SetProp,
  setProp,
} from "./namevm.js";

const { div, span } = genTags;

function main() {
  const rootNode = document.getElementById("app"),
    render = (vdom) => patch(rootNode, vdom);

  const root = new VMView();

  function handleClick(e) {
    const { action } = e.target?.dataset ?? {};

    if (action === undefined) {
      return;
    }

    switch (action) {
      default:
        console.warn("unknown action", action);
    }

    render(root.toDOM());
  }

  let decoration;
  function handleKey(e) {
    const curEnv = root.vm.env;
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

    const newEnv = root.vm.env;
    if (curEnv.props !== newEnv.props) {
      const newLine = newEnv.getProp("l");

      if (newLine && curEnv.getProp("l") !== newLine) {
        const line = parseInt(newLine, 10);
        console.log("set line!", newLine);
        if (decoration) {
          decoration.clear();
        }
        decoration = highlightLine(editor, line);
      }
    }
  }

  rootNode.addEventListener("click", handleClick);
  document.body.addEventListener("keyup", handleKey);

  render(root.toDOM());
  const editor = setupMonaco();
}

// eslint-disable-next-line no-unused-vars
function setupMonaco() {
  const editorNode = document.querySelector("#editor"),
    initialCode = [
      "function helloWorld() {",
      '\tconsole.log("Hello, world!");',
      "}",
      "helloWorld();",
    ].join("\n"),
    editor = monaco.editor.create(editorNode, {
      value: initialCode,
      language: "javascript",
      theme: "vs-dark",
    });

  // setTimeout(() => {
  //   highlightLine(editor, 1);
  //   highlightSpan(editor, 2, 2, 2, 22);
  // }, 1000);

  return editor;
}

function removeHighlightLine(editor, lineNumber) {}
function highlightLine(editor, line) {
  const decoration = {
    range: new monaco.Range(line, 1, line, 1),
    options: {
      isWholeLine: true,
      className: "highlightLine",
    },
  };
  return editor.createDecorationsCollection([decoration]);
}

function highlightSpan(editor, startLine, startChar, endLine, endChar) {
  editor.deltaDecorations(
    [],
    [
      {
        range: new monaco.Range(startLine, startChar, endLine, endChar),
        options: {
          inlineClassName: "highlightSpan",
        },
      },
    ],
  );
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

  return div(
    "frame",
    span("frame-name", this.title),
    div("frame-meta", ...this.meta.notes.map((n) => span("frame-note", n))),
    div("binds", ...items),
  );
};

Scope.prototype.toDOM = function () {
  const len = this.frames.size,
    items = len > 0 ? new Array(len * 2 - 1) : [];

  for (let i = 0, j = len - 1; j >= 0; j--) {
    if (i > 0) {
      items[i] = div("frame-link", "⬆️");
      i += 1;
    }

    items[i] = this.frames.get(j).toDOM();
    i += 1;
  }

  return div("scope", span("scope-title", this.name), ...items);
};

Object.assign(Env.prototype, {
  toDOM() {
    return div("env", this.scopesToDOM(), this.stacksToDOM());
  },
  scopesToDOM() {
    const len = this.scopes.size,
      items = new Array(len);

    let i = 0;
    for (const [_key, val] of this.scopes) {
      items[i] = val.toDOM();
      i += 1;
    }

    return div("scopes", ...items);
  },
  stacksToDOM() {
    const len = this.stacks.size,
      items = new Array(len);

    let i = 0;
    for (const [key, val] of this.stacks) {
      items[i] = val.toDOM(key);
      i += 1;
    }

    return div("stacks", ...items);
  },
});

Stack.prototype.toDOM = function (title = "Stack") {
  const len = this.size,
    items = new Array(len);

  for (let i = len - 1; i >= 0; i--) {
    items[i] = rValue(this.get(i));
  }

  return div("stack", span("stack-title", title), ...items);
};

VM.prototype.toDOM = function () {
  return div("vm", this.env.toDOM());
};

Nop.prototype.toDOM = function () {
  return div("instr instr-nop", span("op-name", "Nop"));
};
Push.prototype.toDOM = function () {
  return div("instr instr-push", span("op-name", "Push"), rValue(this.value));
};
Pop.prototype.toDOM = function () {
  return div("instr instr-pop", span("op-name", "Pop"));
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
LeaveAt.prototype.toDOM = function () {
  return div(
    "instr instr-leaveat",
    span("op-name", "LeaveAt"),
    rValue(this.key),
  );
};
Leave.prototype.toDOM = function () {
  return div("instr instr-leave", span("op-name", "Leave"));
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

function instrDOMToStr(Cls, key) {
  Cls.prototype.toDOM = function () {
    return div(`instr instr-${key}`, span("op-name", this.toString()));
  };
}

instrDOMToStr(Add, "add");
instrDOMToStr(Sub, "sub");
instrDOMToStr(Mul, "mul");
instrDOMToStr(Div, "div");
instrDOMToStr(Eq, "eq");
instrDOMToStr(NotEq, "ne");
instrDOMToStr(Gt, "gt");
instrDOMToStr(Ge, "ge");
instrDOMToStr(Lt, "lt");
instrDOMToStr(Le, "le");
instrDOMToStr(And, "and");
instrDOMToStr(Or, "or");
instrDOMToStr(Not, "not");
instrDOMToStr(Neg, "neg");
instrDOMToStr(SetFrameTitle, "set-title");
instrDOMToStr(AddFrameNote, "add-note");

SetProp.prototype.toDOM = function () {
  return div(
    `instr instr-set-prop`,
    span("op-name", "SetProp"),
    rValue(this.key),
    rValue(this.value),
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
    this.history = new Stack();

    const k1 = "k1",
      v1 = 42,
      v2 = 123;
    this.code = [
      push("My Title"),
      setFrameTitle(),
      push("Note 1"),
      addFrameNote(),
      push("Note 2"),
      addFrameNote(),
      push(v1),
      bind(k1),
      enter("myscope"),
      push(v2),
      rebind(k1),
      setProp("l", "1"),
      find(k1),
      nop(),
      push(v1),
      push(v2),
      neg(),
      add(),
      mul(),
      push(10),
      setProp("l", "2"),
      eq(),
      not(),
      pop(),
      setProp("l", "3"),
      leave(),
      leaveAt(LOCAL),
    ];
  }
  toDOM() {
    return div("vmview", this._codeToDOM(), this.vm.toDOM());
  }
  _codeToDOM() {
    const instrs = new Array(this.code.length);
    for (let i = 0; i < this.code.length; i++) {
      instrs[i] = div(
        this.pc === i + 1 ? "instr-box active" : "instr-box",
        this.code[i].toDOM(),
      );
    }
    return div("code", span("code-title", "Code"), ...instrs);
  }
  next() {
    if (this.code[this.pc]) {
      this.history = this.history.push(this.vm);
      this.vm = this.code[this.pc].exec(this.vm);
      this.pc += 1;
    }
  }
  prev() {
    if (this.history.size > 0) {
      this.vm = this.history.first();
      this.history = this.history.pop();
      this.pc -= 1;
    }
  }
}

main();
