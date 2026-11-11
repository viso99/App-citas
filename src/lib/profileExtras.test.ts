import { describe, expect, it } from "vitest";
import { extrasLabels, GESTURES, PROMPTS, validateExtras, validatePrompts, type Extras } from "./profileExtras";

const empty: Extras = { heightCm: null, job: "", studies: null, smoking: null, drinking: null, children: null };

describe("validateExtras", () => {
  it("acepta todo vacío y valores válidos", () => {
    expect(validateExtras(empty)).toEqual({});
    expect(
      validateExtras({ heightCm: 175, job: "Enfermera", studies: "fp", smoking: "no", drinking: "si", children: "tengo" }),
    ).toEqual({});
  });
  it("rechaza alturas fuera de rango, opciones inventadas y trabajos largos", () => {
    expect(validateExtras({ ...empty, heightCm: 90 }).heightCm).toBeDefined();
    expect(validateExtras({ ...empty, heightCm: 170.5 }).heightCm).toBeDefined();
    expect(validateExtras({ ...empty, smoking: "mucho" }).smoking).toBeDefined();
    expect(validateExtras({ ...empty, studies: "toString" }).studies).toBeDefined();
    expect(validateExtras({ ...empty, job: "x".repeat(61) }).job).toBeDefined();
  });
});

describe("extrasLabels", () => {
  it("enseña solo lo indicado, en orden", () => {
    expect(extrasLabels({ ...empty, heightCm: 180, smoking: "no", job: " Profe " })).toEqual(["180 cm", "Profe", "No fumo"]);
    expect(extrasLabels(empty)).toEqual([]);
  });
});

describe("validatePrompts", () => {
  it("acepta hasta 3 respondidas", () => {
    expect(validatePrompts([])).toBeNull();
    expect(validatePrompts([{ key: "domingo", answer: "Playa" }, { key: "cita", answer: "Un café" }])).toBeNull();
  });
  it("rechaza más de 3, repetidas, inventadas, vacías o largas", () => {
    const keys = Object.keys(PROMPTS);
    expect(validatePrompts(keys.slice(0, 4).map((key) => ({ key, answer: "a" })))).not.toBeNull();
    expect(validatePrompts([{ key: "domingo", answer: "a" }, { key: "domingo", answer: "b" }])).not.toBeNull();
    expect(validatePrompts([{ key: "inventada", answer: "a" }])).not.toBeNull();
    expect(validatePrompts([{ key: "domingo", answer: "  " }])).not.toBeNull();
    expect(validatePrompts([{ key: "domingo", answer: "x".repeat(151) }])).not.toBeNull();
  });
  it("usa claves que acepta la base", () => {
    for (const key of [...Object.keys(PROMPTS), ...Object.keys(GESTURES)]) expect(key).toMatch(/^[a-z_]{1,30}$/);
  });
});
