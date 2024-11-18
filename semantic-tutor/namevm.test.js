import { expect, test } from "bun:test";
import { LOCAL } from './names.js';
import { VM, push, bind, rebind, find, enter, nop } from './namevm.js';

const vm = () => new VM(),
  k1 = "k1",
  v1 = 42,
  v2 = 123;

function run(...instrs) {
  let v = vm().enterAt(LOCAL);

  for (const instr of instrs) {
    console.log(instr.toString());
    v = instr.exec(v);
  }

  return v;
}

test("push", () => {
  expect(run(push(v1)).peek()).toBe(v1);
});

test("push, nop", () => {
  expect(run(push(v1), nop()).peek()).toBe(v1);
});

test("bind/find", () => {
  expect(run(push(v1), bind(k1), find(k1)).peek()).toBe(v1);
});

test("bind/rebind/find", () => {
  expect(run(push(v1), bind(k1), push(v2), rebind(k1), find(k1)).peek()).toBe(v2);
});

test("bind/enter/rebind/find", () => {
  expect(run(push(v1), bind(k1), enter("myscope"), push(v2), rebind(k1), find(k1)).peek()).toBe(v2);
});
