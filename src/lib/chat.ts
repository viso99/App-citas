// Reglas del chat (parte 4 de docs/producto.md). Sin dependencias: lo usan las pantallas y las
// pruebas. La base repite las reglas (largo, quién escribe) en supabase/migrations.

export const MESSAGE_MAX = 1000;

// Columnas de un mensaje que usa el chat (D-22, D-30, D-31, D-32).
export const MESSAGE_COLUMNS =
  "id, sender_id, body, image_path, audio_path, a_reaction, b_reaction, deleted_at, created_at";

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

// Reacciones a mensajes (D-31). Igual que en la base.
export const REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"] as const;

// Notas de voz (D-30): hasta 1 minuto, en la carpeta privada del chat.
export const AUDIO_MAX_SECONDS = 60;
const AUDIO_EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
};

// Tipo de archivo de un audio grabado por el navegador ("audio/webm;codecs=opus" → "audio/webm"),
// o null si no se admite.
export function audioType(mime: string): { type: string; ext: string } | null {
  const type = mime.split(";")[0].trim().toLowerCase();
  const ext = AUDIO_EXTENSIONS[type];
  return ext ? { type, ext } : null;
}

// "0:07", "1:00"
export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.floor(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// "Me gusta" con mensaje (D-26): hasta 200 caracteres.
export const NOTE_MAX = 200;
export function cleanNote(value: string): string | null {
  const text = value.trim();
  if (text.length === 0 || text.length > NOTE_MAX) return null;
  return text;
}
