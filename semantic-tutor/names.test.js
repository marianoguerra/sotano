import { expect, test } from "bun:test";
import { Scope, Frame, Env } from "./names.js";

const f = (name, binds) => new Frame(name, binds),
  s = (...frames) => new Scope(frames),
  e = () => Env.withLocal(),
  k1 = "k1",
  v1 = 42,
  v2 = 123;

test("Frame.find 404", () => {
  expect(f().find(k1)).toBe(null);
});

test("Frame.find 404 with default value", () => {
  expect(f().find(k1, v1)).toBe(v1);
});

test("Empty Scope.find 404", () => {
  expect(s().find(k1)).toBe(null);
});

test("1 frame Scope.find 404", () => {
  expect(s().enter().find(k1)).toBe(null);
});

test("Scope.find value", () => {
  expect(s().enter().bind(k1, v1).find(k1)).toBe(v1);
});

test("Scope.find value in upper frame", () => {
  expect(s().enter().bind(k1, v1).enter().find(k1)).toBe(v1);
});

test("Empty Scope.rebind fails", () => {
  const s1 = s(),
    { i, found, scope } = s1.rebind(k1, v1);

  expect(i).toBe(-1);
  expect(found).toBe(false);
  expect(s1).toEqual(scope);
  expect(s1.find(k1)).toBe(null);
});

test("Scope.rebind without bind fails", () => {
  const s1 = s().enter(),
    { i, found, scope } = s1.rebind(k1, v1);

  expect(i).toBe(-1);
  expect(found).toBe(false);
  expect(s1).toEqual(scope);
  expect(s1.find(k1)).toBe(null);
});

test("Scope.rebind with 1 frame works", () => {
  const s1 = s().enter().bind(k1, v1),
    { i, found, scope } = s1.rebind(k1, v2);

  expect(i).toBe(0);
  expect(found).toBe(true);
  expect(s1).not.toEqual(scope);
  expect(scope.find(k1)).toBe(v2);
});

test("Scope.rebind in upper frame works", () => {
  const s1 = s().enter().bind(k1, v1).enter(),
    { i, found, scope } = s1.rebind(k1, v2);

  expect(i).toBe(1);
  expect(found).toBe(true);
  expect(s1).not.toEqual(scope);
  expect(scope.find(k1)).toBe(v2);
});

//

test("Empty Env.find 404", () => {
  expect(e().find(k1)).toBe(null);
});

test("1 frame Env.find 404", () => {
  expect(e().enter().find(k1)).toBe(null);
});

test("Env.find value", () => {
  expect(e().enter().bind(k1, v1).find(k1)).toBe(v1);
});

test("Env.find value in upper frame", () => {
  expect(e().enter().bind(k1, v1).enter().find(k1)).toBe(v1);
});

test("Empty Env.rebind fails", () => {
  const e1 = e(),
    { i, found, env } = e1.rebind(k1, v1);

  expect(i).toBe(-1);
  expect(found).toBe(false);
  expect(e1).toEqual(env);
  expect(e1.find(k1)).toBe(null);
});

test("Env.rebind without bind fails", () => {
  const e1 = e().enter(),
    { i, found, env } = e1.rebind(k1, v1);

  expect(i).toBe(-1);
  expect(found).toBe(false);
  expect(e1).toEqual(env);
  expect(e1.find(k1)).toBe(null);
});

test("Env.rebind with 1 frame works", () => {
  const e1 = e().enter().bind(k1, v1),
    { i, found, env } = e1.rebind(k1, v2);

  expect(i).toBe(0);
  expect(found).toBe(true);
  expect(e1).not.toEqual(env);
  expect(env.find(k1)).toBe(v2);
});

test("Env.rebind in upper frame works", () => {
  const e1 = e().enter().bind(k1, v1).enter(),
    { i, found, env } = e1.rebind(k1, v2);

  expect(i).toBe(1);
  expect(found).toBe(true);
  expect(e1).not.toEqual(env);
  expect(env.find(k1)).toBe(v2);
});
