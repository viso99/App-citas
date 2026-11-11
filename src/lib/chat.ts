// Reglas del chat (parte 4 de docs/producto.md). Sin dependencias: lo usan las pantallas y las
// pruebas. La base repite las reglas (largo, quién escribe) en supabase/migrations.

export const MESSAGE_MAX = 1000;

// Una coincidencia se guarda con el id menor primero (tabla `matches`). Los uuid en minúsculas
// se ordenan igual como texto que en PostgreSQL.
export function pairOf(me: string, other: string): { userA: string; userB: string } {
  const [userA, userB] = [me.toLowerCase(), other.toLowerCase()].sort();
  return { userA, userB };
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// Devuelve el texto listo para guardar, o null si no se puede enviar.
export function cleanMessage(value: string): string | null {
  const text = value.trim();
  if (text.length === 0 || text.length > MESSAGE_MAX) return null;
  return text;
}

// Carpeta de las fotos de un chat en el almacenamiento (D-22). Igual que en la base.
export function chatFolder(me: string, other: string): string {
  const { userA, userB } = pairOf(me, other);
  return `${userA}_${userB}`;
}

// Cuánto dura el aviso "está escribiendo…" sin nuevas pulsaciones, y cada cuánto se envía.
export const TYPING_SHOWN_MS = 4000;
export const TYPING_SEND_EVERY_MS = 2000;

// Si un mensaje propio ya lo vio la otra persona (abrió el chat después de que se envió).
export function isRead(sentAt: string, otherSeenAt: string | null): boolean {
  return otherSeenAt !== null && new Date(otherSeenAt).getTime() >= new Date(sentAt).getTime();
}
