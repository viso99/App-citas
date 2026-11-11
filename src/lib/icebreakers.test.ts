import { describe, expect, it } from "vitest";
import { icebreakers, MAX_ICEBREAKERS } from "./icebreakers";

describe("icebreakers", () => {
  it("usa una pregunta, una afición en común y completa con ideas generales", () => {
    const ideas = icebreakers(["cine", "padel"], [{ key: "mania", answer: "Ordenar libros" }]);
    expect(ideas).toHaveLength(MAX_ICEBREAKERS);
    expect(ideas[0]).toContain("Una manía mía");
    expect(ideas[1]).toContain("cine");
  });

  it("sin datos devuelve ideas generales", () => {
    expect(icebreakers([], [])).toHaveLength(MAX_ICEBREAKERS);
  });

  it("ignora claves desconocidas", () => {
    const ideas = icebreakers(["inventada"], [{ key: "nada", answer: "x" }]);
    expect(ideas.every((i) => !i.includes("inventada"))).toBe(true);
  });
});
