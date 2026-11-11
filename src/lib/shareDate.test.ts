import { describe, expect, it } from "vitest";
import { dateShareText, formatDateTime } from "./shareDate";

describe("formatDateTime", () => {
  it("da el día y la hora en español", () => {
    expect(formatDateTime("2026-11-12T20:30")).toBe("jueves, 12 de noviembre, 20:30");
    expect(formatDateTime("")).toBeNull();
    expect(formatDateTime("2026-02-31T20:30")).toBeNull();
  });
});

describe("dateShareText", () => {
  it("incluye quién, dónde y cuándo, y omite lo vacío", () => {
    expect(dateShareText({ name: "Lucía", age: 28, place: " Café Central ", when: "2026-11-12T20:30" })).toBe(
      "Voy a quedar con Lucía (28 años), a quien he conocido en Zuvi.\n📍 Dónde: Café Central\n🕗 Cuándo: jueves, 12 de noviembre, 20:30\nTe escribo cuando acabe. Si no sabes nada de mí, llámame, por favor.",
    );
    expect(dateShareText({ name: "Lucía", age: null, place: "", when: "" })).toBe(
      "Voy a quedar con Lucía, a quien he conocido en Zuvi.\nTe escribo cuando acabe. Si no sabes nada de mí, llámame, por favor.",
    );
  });
});
