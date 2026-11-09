import { describe, expect, it } from "vitest";
import cities from "../data/ciudades-es.json";
import {
  distanceLabel,
  isValidLocation,
  normalizeName,
  roundCoordinate,
  searchCities,
  validatePreferences,
  type City,
} from "./discover";

const list = cities as City[];
const names = (q: string) => searchCities(list, q).map((i) => `${list[i][0]} (${list[i][1]})`);

describe("validatePreferences", () => {
  it("acepta los valores por defecto", () => {
    expect(validatePreferences({ minAge: 18, maxAge: 99, maxDistanceKm: 50 })).toEqual({});
  });
  it("rechaza menores de 18, máximo menor que mínimo y distancias fuera de rango", () => {
    expect(validatePreferences({ minAge: 17, maxAge: 30, maxDistanceKm: 50 }).minAge).toBeDefined();
    expect(validatePreferences({ minAge: 30, maxAge: 25, maxDistanceKm: 50 }).maxAge).toBeDefined();
    expect(validatePreferences({ minAge: 18, maxAge: 99, maxDistanceKm: 1 }).maxDistanceKm).toBeDefined();
    expect(validatePreferences({ minAge: 18, maxAge: 99, maxDistanceKm: 201 }).maxDistanceKm).toBeDefined();
    expect(validatePreferences({ minAge: 18.5, maxAge: 99, maxDistanceKm: 50 }).minAge).toBeDefined();
  });
});

describe("ubicación", () => {
  it("redondea a una cuadrícula de 0,02 grados", () => {
    expect(roundCoordinate(40.41678)).toBe(40.42);
    expect(roundCoordinate(-3.70379)).toBe(-3.7);
    expect(roundCoordinate(40.409)).toBe(40.4);
    expect(roundCoordinate(28.1235)).toBe(28.12);
  });
  it("valida rangos", () => {
    expect(isValidLocation(40.4, -3.7)).toBe(true);
    expect(isValidLocation(91, 0)).toBe(false);
    expect(isValidLocation(Number.NaN, 0)).toBe(false);
  });
  it("nunca muestra menos de 2 km", () => {
    expect(distanceLabel(0)).toBe("A menos de 2 km");
    expect(distanceLabel(1.9)).toBe("A menos de 2 km");
    expect(distanceLabel(12.4)).toBe("A 12 km");
  });
});

describe("searchCities", () => {
  it("ignora tildes y mayúsculas", () => {
    expect(normalizeName("Ávila")).toBe("avila");
    expect(names("avila")[0]).toBe("Ávila (Ávila)");
    expect(names("MALAGA")[0]).toBe("Málaga (Málaga)");
  });
  it("encuentra nombres bilingües por cualquiera de sus partes", () => {
    expect(names("vitoria")[0]).toBe("Gasteiz / Vitoria (Álava)");
    expect(names("san sebas")).toContain("Donostia / San Sebastián (Gipuzkoa)");
  });
  it("pone primero las ciudades más grandes y no busca con menos de 2 letras", () => {
    expect(names("madrid")[0]).toBe("Madrid (Madrid)");
    expect(searchCities(list, "m")).toEqual([]);
  });
});
