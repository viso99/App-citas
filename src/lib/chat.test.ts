import { describe, expect, it } from "vitest";
import { cleanMessage, isUuid, MESSAGE_MAX, pairOf } from "./chat";

const a = "00000000-0000-0000-0000-00000000000a";
const b = "00000000-0000-0000-0000-00000000000b";

describe("pairOf", () => {
  it("pone siempre el id menor primero, como la tabla matches", () => {
    expect(pairOf(a, b)).toEqual({ userA: a, userB: b });
    expect(pairOf(b, a)).toEqual({ userA: a, userB: b });
    expect(pairOf(b.toUpperCase(), a)).toEqual({ userA: a, userB: b });
  });
});

describe("isUuid", () => {
  it("acepta uuid y rechaza otra cosa", () => {
    expect(isUuid(a)).toBe(true);
    expect(isUuid("hola")).toBe(false);
    expect(isUuid(`${a}x`)).toBe(false);
  });
});

describe("cleanMessage", () => {
  it("quita espacios y rechaza vacíos o demasiado largos", () => {
    expect(cleanMessage("  hola  ")).toBe("hola");
    expect(cleanMessage("   ")).toBeNull();
    expect(cleanMessage("x".repeat(MESSAGE_MAX))).toHaveLength(MESSAGE_MAX);
    expect(cleanMessage("x".repeat(MESSAGE_MAX + 1))).toBeNull();
  });
});
