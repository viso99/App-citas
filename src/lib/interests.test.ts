import { describe, expect, it } from "vitest";
import { INTEREST_GROUPS, INTERESTS, interestChips, MAX_INTERESTS, validateInterests } from "./interests";

describe("lista de aficiones", () => {
  it("es amplia y sin claves repetidas entre grupos", () => {
    const keys = INTEREST_GROUPS.flatMap((g) => Object.keys(g.items));
    expect(keys.length).toBeGreaterThanOrEqual(50);
    expect(new Set(keys).size).toBe(keys.length);
    expect(Object.keys(INTERESTS)).toHaveLength(keys.length);
  });
  it("usa claves que acepta la base (minúsculas y guiones bajos, hasta 30)", () => {
    for (const key of Object.keys(INTERESTS)) expect(key).toMatch(/^[a-z_]{1,30}$/);
  });
});

describe("validateInterests", () => {
  it("acepta ninguna y hasta el máximo", () => {
    expect(validateInterests([])).toBeNull();
    expect(validateInterests(Object.keys(INTERESTS).slice(0, MAX_INTERESTS))).toBeNull();
  });
  it("rechaza más del máximo, repetidas y desconocidas", () => {
    expect(validateInterests(Object.keys(INTERESTS).slice(0, MAX_INTERESTS + 1))).not.toBeNull();
    expect(validateInterests(["cine", "cine"])).not.toBeNull();
    expect(validateInterests(["inventada"])).not.toBeNull();
    expect(validateInterests(["toString"])).not.toBeNull();
  });
});

describe("interestChips", () => {
  it("pone primero las que tenéis en común e ignora claves que ya no existen", () => {
    expect(interestChips(["cine", "surf", "vieja", "cafe"], ["cafe", "surf"])).toEqual([
      { key: "surf", label: "Surf", shared: true },
      { key: "cafe", label: "Café", shared: true },
      { key: "cine", label: "Cine", shared: false },
    ]);
  });
});
