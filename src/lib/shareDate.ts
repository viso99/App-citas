// "Compartir mi cita" (D-38): un texto para mandar a alguien de confianza con quién y dónde vas
// a quedar. No se guarda nada: el texto sale del móvil solo si la persona lo comparte.

export const PLACE_MAX = 120;

// "2026-11-12T20:30" (lo que da un campo de fecha y hora) → "jueves, 12 de noviembre, 20:30".
export function formatDateTime(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi));
  if (Number.isNaN(date.getTime()) || date.getUTCDate() !== d) return null;
  const day = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(date);
  return `${day}, ${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

export function dateShareText({
  name,
  age,
  place,
  when,
}: {
  name: string;
  age: number | null;
  place: string;
  when: string;
}): string {
  const who = age ? `${name} (${age} años)` : name;
  const lines = [`Voy a quedar con ${who}, a quien he conocido en Zuvi.`];
  const where = place.trim().slice(0, PLACE_MAX);
  if (where) lines.push(`📍 Dónde: ${where}`);
  const time = formatDateTime(when);
  if (time) lines.push(`🕗 Cuándo: ${time}`);
  lines.push("Te escribo cuando acabe. Si no sabes nada de mí, llámame, por favor.");
  return lines.join("\n");
}
