import { describe, expect, it } from "vitest";
import { chatFolder, cleanMessage, isRead, isUuid, MESSAGE_MAX, pairOf } from "./chat";

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

describe("chatFolder", () => {
  it("es la misma carpeta para las dos personas", () => {
    expect(chatFolder(a, b)).toBe(`${a}_${b}`);
    expect(chatFolder(b, a)).toBe(`${a}_${b}`);
  });
});

describe("isRead", () => {
  it("está leído si la otra persona abrió el chat después de enviarlo", () => {
    expect(isRead("2026-11-11T10:00:00Z", null)).toBe(false);
    expect(isRead("2026-11-11T10:00:00Z", "2026-11-11T09:59:59Z")).toBe(false);
    expect(isRead("2026-11-11T10:00:00Z", "2026-11-11T10:00:00Z")).toBe(true);
    expect(isRead("2026-11-11T10:00:00Z", "2026-11-11T10:05:00+01:00")).toBe(false);
  });
});
