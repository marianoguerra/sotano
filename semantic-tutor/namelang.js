import ohm from "./ohm.js";

import {
  nop,
  add,
  sub,
  mul,
  div,
  eq,
  ne,
  lt,
  le,
  gt,
  ge,
  and,
  or,
  push,
  pop,
  setProp,
  setFrameTitle,
  addFrameNote,
  bind,
  rebind,
  enter,
  leave,
  find,
  leaveAt,
} from "./namevm.js";

const grammar = ohm.grammar(`
  NameLang {
    Code = Expr+
    Expr = Instr | op | PushValue | LookupName

    Instr = ident Args?
    ident = letter alnum*
    Args = "(" ArgItems? ")"
    ArgItems = Arg ("," Arg)*
    Arg = number | string

    op = "&&" | "||" | "+" | "-" | "*" | "/" | "==" | "!=" | "<=" | "<" | ">=" | ">"

    PushValue = number | string
    number = digit+

    stringDelimiter = "'" | "\\\""
    string = stringDelimiter (~stringDelimiter any)* stringDelimiter

    LookupName = "$" ident
  }
`);

const semantics = grammar.createSemantics();

const compile = semantics.addOperation("compile", {
  Code(instrs) {
    return instrs.children.map((instr) => instr.compile());
  },
  Expr(instr) {
    return instr.compile();
  },
  Instr(name, args) {
    return toOp(
      name.sourceString,
      args.children.map((v) => v.compile())[0] ?? [],
    );
  },
  Args(_o, argsOpt, _c) {
    const args = argsOpt.children[0];
    return args ? args.compile() : [];
  },
  ArgItems(first, _c, rest) {
    return [first.compile()].concat(rest.children.map((v) => v.compile()));
  },
  Arg(v) {
    return v.compile();
  },
  op(name) {
    return toOp(name.sourceString, []);
  },
  PushValue(v) {
    return push(v.compile());
  },
  LookupName(_$, name) {
    return find(name.sourceString);
  },
  string(_o, s, _c) {
    return s.sourceString;
  },
  number(s) {
    return parseInt(s.sourceString, 10);
  },
});

export function parse(code) {
  const m = grammar.match(code);
  if (m.succeeded()) {
    return compile(m).compile();
  } else {
    throw new Error(m.message);
  }
}

function toOp(op, args) {
  switch (op) {
    case "nop":
      return nop();
    case "+":
      return add();
    case "-":
      return sub();
    case "*":
      return mul();
    case "/":
      return div();
    case "==":
      return eq();
    case "!=":
      return ne();
    case "<":
      return lt();
    case "<=":
      return le();
    case ">":
      return gt();
    case ">=":
      return ge();
    case "&&":
      return and();
    case "||":
      return or();
    case "pop":
      return pop();
    case "line":
      return setProp("l", args[0]);
    case "setFrameTitle":
      return setFrameTitle();
    case "addFrameNote":
      return addFrameNote();
    case "bind":
      return bind(args[0]);
    case "rebind":
      return rebind(args[0]);
    case "enter":
      return enter(args[0]);
    case "leave":
      return leave();
    case "find":
      return find(args[0]);
    case "leaveAt":
      return leaveAt(args[0]);
    default:
      return null;
  }
}
