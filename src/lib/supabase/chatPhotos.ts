import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CHAT_PHOTOS_BUCKET } from "./config";

// Borra las fotos de esos chats (D-22). Hay que llamarlo ANTES de borrar la coincidencia
// (deshacer, bloquear, denunciar o borrar la cuenta): las reglas del almacenamiento solo dejan
// borrarlas mientras la coincidencia existe. Devuelve false si algo falló.
export async function removeChatPhotos(supabase: SupabaseClient, folders: string[]): Promise<boolean> {
  const bucket = supabase.storage.from(CHAT_PHOTOS_BUCKET);
  for (const folder of folders) {
    const { data: files, error } = await bucket.list(folder, { limit: 1000 });
    if (error) return false;
    if (files.length > 0) {
      const { error: removeError } = await bucket.remove(files.map((f) => `${folder}/${f.name}`));
      if (removeError) return false;
    }
  }
  return true;
}
