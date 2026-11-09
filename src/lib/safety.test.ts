import { describe, expect, it } from "vitest";
import { cleanDetails, isReportReason, REPORT_DETAILS_MAX } from "./safety";

describe("isReportReason", () => {
  it("acepta solo los motivos de la base", () => {
    expect(isReportReason("acoso")).toBe(true);
    expect(isReportReason("menor_de_edad")).toBe(true);
    expect(isReportReason("feo")).toBe(false);
    expect(isReportReason(undefined)).toBe(false);
  });
});

describe("cleanDetails", () => {
  it("recorta y deja vacío como null", () => {
    expect(cleanDetails("  me insultó ")).toBe("me insultó");
    expect(cleanDetails("   ")).toBeNull();
    expect(cleanDetails(null)).toBeNull();
  });
  it("rechaza textos demasiado largos u otros tipos", () => {
    expect(cleanDetails("x".repeat(REPORT_DETAILS_MAX))).toHaveLength(REPORT_DETAILS_MAX);
    expect(cleanDetails("x".repeat(REPORT_DETAILS_MAX + 1))).toBeUndefined();
    expect(cleanDetails(5)).toBeUndefined();
  });
});
