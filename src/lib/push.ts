// Textos de los avisos en el móvil (D-24). Sin nombres ni contenido: se ven en la pantalla
// bloqueada y no deben revelar con quién habla nadie.
// "reminder" es el recordatorio de un chat parado (D-40).
export type PushKind = "match" | "message" | "reminder";

export function pushPayload(kind: PushKind, otherId: string) {
  if (kind === "match") return { title: "Zuvi", body: "¡Tienes una coincidencia nueva!", tag: "match", url: "/coincidencias" };
  if (kind === "reminder") {
    return { title: "Zuvi", body: "Tienes una conversación esperando.", tag: `chat-${otherId}`, url: `/chat/${otherId}` };
  }
  return { title: "Zuvi", body: "Tienes un mensaje nuevo.", tag: `chat-${otherId}`, url: `/chat/${otherId}` };
}

// Convierte la clave pública VAPID (base64url) al formato que pide el navegador.
export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
