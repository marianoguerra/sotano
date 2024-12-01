import { expect, test } from "bun:test";
import { parse } from "./namelang.js";
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
  find,
} from "./namevm.js";

function parseIs(code, ...instrs) {
  const parsedInstrs = parse(code);
  expect(parsedInstrs.length).toBe(instrs.length);
  for (let i = 0; i < parsedInstrs.length; i++) {
    expect(parsedInstrs[i].toString()).toBe(instrs[i].toString());
  }
}

test("parse nop", () => {
  parseIs("nop", nop());
  parseIs("nop()", nop());
});

test("parse arithmetic", () => {
  parseIs("+", add());
  parseIs("-", sub());
  parseIs("*", mul());
  parseIs("/", div());
});

test("parse comparison", () => {
  parseIs("==", eq());
  parseIs("!=", ne());
  parseIs("<", lt());
  parseIs("<=", le());
  parseIs(">", gt());
  parseIs(">=", ge());
});

test("parse bool", () => {
  parseIs("&&", and());
  parseIs("||", or());
});

test("parse stack ops", () => {
  parseIs("''", push(""));
  parseIs("'hello world'", push("hello world"));
  parseIs("pop", pop());
  parseIs("0", push(0));
  parseIs("12340", push(12340));
});

test("parse ops with args", () => {
  parseIs("line(42)", setProp("l", 42));
});

test("instruction sequence", () => {
  parseIs("10 20 + 1 *", push(10), push(20), add(), push(1), mul());
  parseIs("10 $foo \n\t+ 1 *", push(10), find("foo"), add(), push(1), mul());
});
