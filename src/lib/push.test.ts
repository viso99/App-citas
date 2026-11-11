import { describe, expect, it } from "vitest";
import { base64UrlToBytes, pushPayload } from "./push";

describe("pushPayload", () => {
  it("no incluye nombres ni texto de mensajes", () => {
    expect(pushPayload("match", "x")).toEqual({
      title: "Zuvi",
      body: "¡Tienes una coincidencia nueva!",
      tag: "match",
      url: "/coincidencias",
    });
    expect(pushPayload("message", "abc").url).toBe("/chat/abc");
    expect(pushPayload("reminder", "abc")).toEqual({
      title: "Zuvi",
      body: "Tienes una conversación esperando.",
      tag: "chat-abc",
      url: "/chat/abc",
    });
  });
});

describe("base64UrlToBytes", () => {
  it("decodifica base64url sin relleno", () => {
    expect(Array.from(base64UrlToBytes("AQID_-8"))).toEqual([1, 2, 3, 255, 239]);
  });
});
