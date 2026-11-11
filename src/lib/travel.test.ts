import { describe, expect, it } from "vitest";
import { activeTravelCity, isTravelCity, TRAVEL_CITIES, travelCityName } from "./travel";

describe("modo viaje", () => {
  it("solo acepta ciudades de la lista", () => {
    expect(isTravelCity("madrid")).toBe(true);
    expect(isTravelCity("toString")).toBe(false);
    expect(isTravelCity(null)).toBe(false);
    expect(travelCityName("sevilla")).toBe("Sevilla");
    expect(travelCityName("atlantida")).toBeNull();
  });
  it("las claves y coordenadas valen para la base y caen en España", () => {
    for (const [key, c] of Object.entries(TRAVEL_CITIES)) {
      expect(key).toMatch(/^[a-z_]{1,30}$/);
      expect(c.lat).toBeGreaterThan(27);
      expect(c.lat).toBeLessThan(44);
      expect(c.lon).toBeGreaterThan(-19);
      expect(c.lon).toBeLessThan(5);
    }
  });
  it("caduca a los 30 días", () => {
    const now = new Date("2026-11-11T12:00:00Z");
    expect(activeTravelCity("madrid", "2026-11-01T12:00:00Z", now)).toBe("madrid");
    expect(activeTravelCity("madrid", "2026-10-11T11:00:00Z", now)).toBeNull();
    expect(activeTravelCity("madrid", null, now)).toBeNull();
    expect(activeTravelCity("atlantida", "2026-11-10T12:00:00Z", now)).toBeNull();
  });
});
