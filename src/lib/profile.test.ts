import { describe, expect, it } from "vitest";
import { ageOn, moveItem, parseDate, photoCountError, validatePhoto, validateProfile, type ProfileInput } from "./profile";

const today = new Date(Date.UTC(2026, 10, 9)); // 2026-11-09

const valid: ProfileInput = {
  firstName: "Lucía",
  birthDate: "1995-04-20",
  bio: "",
  gender: "mujer",
  interestedIn: "hombres",
  sensitiveConsent: true,
  interests: ["cine", "padel"],
};

describe("parseDate", () => {
  it("acepta una fecha válida", () => {
    expect(parseDate("2000-02-29")).not.toBeNull();
  });
  it("rechaza fechas que no existen o mal escritas", () => {
    expect(parseDate("2001-02-29")).toBeNull();
    expect(parseDate("2001-13-01")).toBeNull();
    expect(parseDate("20/04/1995")).toBeNull();
    expect(parseDate("")).toBeNull();
  });
});

describe("ageOn", () => {
  it("cuenta los años cumplidos", () => {
    expect(ageOn(parseDate("2008-11-09")!, today)).toBe(18);
    expect(ageOn(parseDate("2008-11-10")!, today)).toBe(17);
  });
});

describe("validateProfile", () => {
  it("acepta un perfil completo", () => {
    expect(validateProfile(valid, today)).toEqual({});
  });
  it("acepta a quien cumple 18 hoy y rechaza a quien los cumple mañana", () => {
    expect(validateProfile({ ...valid, birthDate: "2008-11-09" }, today)).toEqual({});
    expect(validateProfile({ ...valid, birthDate: "2008-11-10" }, today).birthDate).toBeDefined();
  });
  it("rechaza fechas futuras", () => {
    expect(validateProfile({ ...valid, birthDate: "2030-01-01" }, today).birthDate).toBeDefined();
  });
  it("exige nombre y limita su largo", () => {
    expect(validateProfile({ ...valid, firstName: "  " }, today).firstName).toBeDefined();
    expect(validateProfile({ ...valid, firstName: "a".repeat(41) }, today).firstName).toBeDefined();
  });
  it("la descripción es opcional pero tiene un máximo", () => {
    expect(validateProfile({ ...valid, bio: "a".repeat(500) }, today).bio).toBeUndefined();
    expect(validateProfile({ ...valid, bio: "a".repeat(501) }, today).bio).toBeDefined();
  });
  it("solo acepta las opciones conocidas de género y de a quién conocer", () => {
    expect(validateProfile({ ...valid, gender: "otro" }, today).gender).toBeDefined();
    expect(validateProfile({ ...valid, interestedIn: "" }, today).interestedIn).toBeDefined();
  });
  it("exige el consentimiento para los datos sensibles", () => {
    expect(validateProfile({ ...valid, sensitiveConsent: false }, today).sensitiveConsent).toBeDefined();
  });
});

describe("fotos", () => {
  it("acepta JPG, PNG y WebP de hasta 5 MB", () => {
    expect(validatePhoto({ size: 1000, type: "image/jpeg" })).toBeNull();
    expect(validatePhoto({ size: 5 * 1024 * 1024, type: "image/webp" })).toBeNull();
    expect(validatePhoto({ size: 5 * 1024 * 1024 + 1, type: "image/png" })).not.toBeNull();
    expect(validatePhoto({ size: 1000, type: "image/gif" })).not.toBeNull();
  });
  it("pide de 2 a 6 fotos", () => {
    expect(photoCountError(1)).not.toBeNull();
    expect(photoCountError(2)).toBeNull();
    expect(photoCountError(6)).toBeNull();
    expect(photoCountError(7)).not.toBeNull();
  });
});

describe("moveItem", () => {
  it("mueve un elemento y deja el resto en orden", () => {
    expect(moveItem(["a", "b", "c", "d"], 2, 0)).toEqual(["c", "a", "b", "d"]);
    expect(moveItem(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
  });
  it("no cambia nada con posiciones fuera de la lista", () => {
    expect(moveItem(["a", "b"], 0, 2)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], -1, 0)).toEqual(["a", "b"]);
  });
});
