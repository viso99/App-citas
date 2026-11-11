import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { interestChips } from "@/lib/interests";
import { PHOTOS_BUCKET } from "@/lib/supabase/config";

export type Card = {
  id: string;
  firstName: string;
  age: number;
  bio: string;
  distanceKm: number;
  photos: string[];
  // Aficiones del perfil, primero las que tenéis en común (D-18).
  interests: { key: string; label: string; shared: boolean }[];
  // Este perfil te dio un superlike (D-17).
  superlikedMe: boolean;
};

type Row = {
  id: string;
  first_name: string;
  age: number;
  bio: string;
  distance_km: number;
  photo_paths: string[];
  interests: string[];
  shared_interests: string[];
  superliked_me: boolean;
};

// Los próximos perfiles de Descubrir, con sus fotos como enlaces firmados de una hora.
// Qué perfiles se ven lo decide la base (discover_profiles en supabase/migrations).
export async function loadCards(supabase: SupabaseClient): Promise<Card[]> {
  const { data, error } = await supabase.rpc("discover_profiles", { max_results: 10 });
  if (error || !data) return [];
  const rows = data as Row[];
  const paths = rows.flatMap((r) => r.photo_paths);
  const urls = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage.from(PHOTOS_BUCKET).createSignedUrls(paths, 3600);
    signed?.forEach((s) => s.path && s.signedUrl && urls.set(s.path, s.signedUrl));
  }
  return rows.map((r) => ({
    id: r.id,
    firstName: r.first_name,
    age: r.age,
    bio: r.bio,
    distanceKm: r.distance_km,
    photos: r.photo_paths.map((p) => urls.get(p)).filter((u): u is string => Boolean(u)),
    interests: interestChips(r.interests ?? [], r.shared_interests ?? []),
    superlikedMe: r.superliked_me === true,
  }));
}
