import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { interestChips } from "@/lib/interests";
import { extrasFromRow, extrasLabels, lookingForLabel, PROMPTS, type PromptAnswer } from "@/lib/profileExtras";
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
  // Perfil verificado, datos opcionales y preguntas (D-23).
  verified: boolean;
  details: string[];
  prompts: { question: string; answer: string }[];
  // Mensaje que te dejó con su "me gusta" (D-26) y si usó la app en las últimas 24 horas (D-28).
  noteToMe: string | null;
  activeRecently: boolean;
  // Qué busca (D-36) y si está de viaje por tu zona (D-39).
  lookingFor: string | null;
  traveling: boolean;
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
  prompts: PromptAnswer[] | null;
  height_cm: number | null;
  job: string | null;
  studies: string | null;
  smoking: string | null;
  drinking: string | null;
  children: string | null;
  verified: boolean;
  note_to_me: string | null;
  active_recently: boolean | null;
  looking_for: string | null;
  languages: string[] | null;
  pets: string | null;
  zodiac: string | null;
  traveling: boolean | null;
};

// Los próximos perfiles de Descubrir, con sus fotos como enlaces firmados de una hora.
// Qué perfiles se ven lo decide la base (discover_profiles en supabase/migrations).
// Con onlyLikers, solo quienes te dieron "me gusta" (D-25).
export async function loadCards(supabase: SupabaseClient, onlyLikers = false): Promise<Card[]> {
  const { data, error } = await supabase.rpc("discover_profiles", { max_results: 10, only_likers: onlyLikers });
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
    verified: r.verified === true,
    details: extrasLabels(extrasFromRow(r)),
    lookingFor: lookingForLabel(r.looking_for),
    traveling: r.traveling === true,
    prompts: (r.prompts ?? [])
      .filter((p) => Object.prototype.hasOwnProperty.call(PROMPTS, p.key))
      .map((p) => ({ question: PROMPTS[p.key as keyof typeof PROMPTS], answer: p.answer })),
    noteToMe: r.note_to_me,
    activeRecently: r.active_recently === true,
  }));
}
