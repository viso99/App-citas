import { describe, expect, it } from "vitest";
import {
  EMPTY_EXTRAS,
  extrasFromRow,
  extrasLabels,
  GESTURES,
  LANGUAGES,
  languagesLabel,
  lookingForLabel,
  LOOKING_FOR,
  PETS,
  PROMPTS,
  validateExtras,
  validatePrompts,
  ZODIAC,
} from "./profileExtras";

const empty = EMPTY_EXTRAS;

describe("validateExtras", () => {
  it("acepta todo vacío y valores válidos", () => {
    expect(validateExtras(empty)).toEqual({});
    expect(
      validateExtras({
        ...empty,
        heightCm: 175,
        job: "Enfermera",
        studies: "fp",
        smoking: "no",
        drinking: "si",
        children: "tengo",
        lookingFor: "estable",
        languages: ["es", "en"],
        pets: "gato",
        zodiac: "leo",
      }),
    ).toEqual({});
  });
  it("rechaza alturas fuera de rango, opciones inventadas y trabajos largos", () => {
    expect(validateExtras({ ...empty, heightCm: 90 }).heightCm).toBeDefined();
    expect(validateExtras({ ...empty, heightCm: 170.5 }).heightCm).toBeDefined();
    expect(validateExtras({ ...empty, smoking: "mucho" }).smoking).toBeDefined();
    expect(validateExtras({ ...empty, studies: "toString" }).studies).toBeDefined();
    expect(validateExtras({ ...empty, job: "x".repeat(61) }).job).toBeDefined();
    expect(validateExtras({ ...empty, lookingFor: "sexo" }).lookingFor).toBeDefined();
    expect(validateExtras({ ...empty, zodiac: "ofiuco" }).zodiac).toBeDefined();
    expect(validateExtras({ ...empty, pets: "toString" }).pets).toBeDefined();
    expect(validateExtras({ ...empty, languages: ["es", "es"] }).languages).toBeDefined();
    expect(validateExtras({ ...empty, languages: ["xx"] }).languages).toBeDefined();
    expect(validateExtras({ ...empty, languages: ["es", "en", "fr", "de", "it", "pt"] }).languages).toBeDefined();
  });
  it("lee las columnas de la base", () => {
    expect(extrasFromRow(null)).toEqual(empty);
    expect(extrasFromRow({ looking_for: "amistad", languages: ["es"] })).toEqual({
      ...empty,
      lookingFor: "amistad",
      languages: ["es"],
    });
  });
});

describe("extrasLabels", () => {
  it("enseña solo lo indicado, en orden", () => {
    expect(extrasLabels({ ...empty, heightCm: 180, smoking: "no", job: " Profe " })).toEqual(["180 cm", "Profe", "No fumo"]);
    expect(extrasLabels(empty)).toEqual([]);
    expect(extrasLabels({ ...empty, pets: "perro", zodiac: "leo", languages: ["es"] })).toEqual([
      "Tengo perro",
      "Signo: Leo",
      "Habla español",
    ]);
  });
  it("une los idiomas con y/e", () => {
    expect(languagesLabel([])).toBeUndefined();
    expect(languagesLabel(["es", "en"])).toBe("Habla español e inglés");
    expect(languagesLabel(["ca", "es", "fr"])).toBe("Habla catalán, español y francés");
    expect(languagesLabel(["es", "lse"])).toBe("Habla español y lengua de signos");
    expect(languagesLabel(["es", "xx"])).toBe("Habla español");
  });
  it("qué buscas: solo opciones de la lista y ninguna sobre sexo", () => {
    expect(lookingForLabel("estable")).toBe("Una relación estable");
    expect(lookingForLabel("toString")).toBeNull();
    expect(lookingForLabel(null)).toBeNull();
    for (const text of Object.values(LOOKING_FOR)) expect(text.toLowerCase()).not.toMatch(/sex|casual|rollo/);
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
    for (const key of [
      ...Object.keys(PROMPTS),
      ...Object.keys(GESTURES),
      ...Object.keys(LOOKING_FOR),
      ...Object.keys(PETS),
      ...Object.keys(ZODIAC),
      ...Object.keys(LANGUAGES),
    ])
      expect(key).toMatch(/^[a-z_]{1,30}$/);
  });
});
