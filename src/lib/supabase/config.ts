// Datos públicos del proyecto de Supabase (ver docs/desarrollo.md). La clave "publishable"
// puede estar en el navegador: lo que protege los datos son las reglas de acceso (RLS)
// de supabase/migrations.
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copia .env.example a .env.local (docs/desarrollo.md).",
    );
  }
  return { url, key };
}

export const PHOTOS_BUCKET = "profile-photos";
