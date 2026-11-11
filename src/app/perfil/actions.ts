"use server";

import { redirect } from "next/navigation";
import { validatePreferences, type PreferenceErrors, type Preferences } from "@/lib/discover";
import { photoCountError, validateProfile, type ProfileErrors, type ProfileInput } from "@/lib/profile";
import {
  GESTURES,
  validateExtras,
  validatePrompts,
  type Extras,
  type ExtrasErrors,
  type Filters,
  type PromptAnswer,
} from "@/lib/profileExtras";
import { PHOTOS_BUCKET, VERIFICATION_BUCKET } from "@/lib/supabase/config";
import { chatFolder } from "@/lib/chat";
import { removeChatPhotos } from "@/lib/supabase/chatPhotos";
import { getUser } from "@/lib/supabase/server";

export type SaveResult =
  | { ok: true }
  | { ok: false; errors: ProfileErrors & PreferenceErrors & ExtrasErrors; message?: string };

// Lo opcional del perfil (D-23): datos, preguntas y filtros de Descubrir.
export type ProfileMore = { extras: Extras; prompts: PromptAnswer[]; filters: Filters };

export async function saveProfile(input: ProfileInput, preferences: Preferences, more: ProfileMore): Promise<SaveResult> {
  const { supabase, user } = await getUser();
  if (!user) redirect("/entrar");

  const errors = { ...validateProfile(input), ...validatePreferences(preferences), ...validateExtras(more.extras) };
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const promptsError = validatePrompts(more.prompts);
  if (promptsError) return { ok: false, errors: {}, message: promptsError };

  const { count, error: countError } = await supabase
    .from("profile_photos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (countError) return { ok: false, errors: {}, message: "No pudimos comprobar tus fotos." };
  const photoError = photoCountError(count ?? 0);
  if (photoError) return { ok: false, errors: {}, message: photoError };

  const { data: existing } = await supabase
    .from("profiles")
    .select("sensitive_data_consent_at")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    first_name: input.firstName.trim(),
    birth_date: input.birthDate,
    bio: input.bio.trim(),
    gender: input.gender,
    interested_in: input.interestedIn,
    min_age: preferences.minAge,
    max_age: preferences.maxAge,
    max_distance_km: preferences.maxDistanceKm,
    interests: input.interests,
    prompts: more.prompts.map((p) => ({ key: p.key, answer: p.answer.trim() })),
    height_cm: more.extras.heightCm,
    job: more.extras.job.trim() || null,
    studies: more.extras.studies,
    smoking: more.extras.smoking,
    drinking: more.extras.drinking,
    children: more.extras.children,
    filter_non_smokers: Boolean(more.filters.onlyNonSmokers),
    filter_wants_children: Boolean(more.filters.onlyWantsChildren),
    filter_verified: Boolean(more.filters.onlyVerified),
    // Se conserva la fecha del primer consentimiento.
    sensitive_data_consent_at: existing?.sensitive_data_consent_at ?? new Date().toISOString(),
  });
  if (error) return { ok: false, errors: {}, message: "No pudimos guardar el perfil. Inténtalo de nuevo." };
  return { ok: true };
}

// Pide la verificación con el selfie ya subido a su carpeta (D-23).
export async function requestVerification(path: string, gesture: string): Promise<{ ok: boolean }> {
  const { supabase, user } = await getUser();
  if (!user) redirect("/entrar");
  if (!Object.prototype.hasOwnProperty.call(GESTURES, gesture) || !path.startsWith(`${user.id}/`)) return { ok: false };
  const { error } = await supabase.rpc("request_verification", { path, gesture });
  return { ok: !error };
}

export async function signOut() {
  const { supabase } = await getUser();
  await supabase.auth.signOut();
  redirect("/");
}

// Borra la cuenta y todos sus datos (regla 6 de docs/privacidad-y-legal.md). Primero los
// archivos de fotos (Supabase no deja borrarlos desde SQL) y después el usuario, que borra
// en cascada perfil, coincidencias, mensajes, bloqueos y denuncias.
export async function deleteAccount(): Promise<{ ok: false }> {
  const { supabase, user } = await getUser();
  if (!user) redirect("/entrar");

  const bucket = supabase.storage.from(PHOTOS_BUCKET);
  const { data: files, error: listError } = await bucket.list(user.id, { limit: 1000 });
  if (listError) return { ok: false };
  if (files.length > 0) {
    const { error } = await bucket.remove(files.map((f) => `${user.id}/${f.name}`));
    if (error) return { ok: false };
  }

  // El selfie de verificación, si lo había (D-23).
  const selfies = supabase.storage.from(VERIFICATION_BUCKET);
  const { data: selfieFiles, error: selfieError } = await selfies.list(user.id, { limit: 100 });
  if (selfieError) return { ok: false };
  if (selfieFiles.length > 0) {
    const { error } = await selfies.remove(selfieFiles.map((f) => `${user.id}/${f.name}`));
    if (error) return { ok: false };
  }

  // Las fotos de sus chats (D-22), mientras las coincidencias existen.
  const { data: matches, error: matchesError } = await supabase.rpc("my_matches");
  if (matchesError) return { ok: false };
  const folders = ((matches ?? []) as { id: string }[]).map((m) => chatFolder(user.id, m.id));
  if (!(await removeChatPhotos(supabase, folders))) return { ok: false };

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { ok: false };
  await supabase.auth.signOut({ scope: "local" });
  redirect("/cuenta-eliminada");
}
