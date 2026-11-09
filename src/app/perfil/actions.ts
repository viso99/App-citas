"use server";

import { redirect } from "next/navigation";
import { validatePreferences, type PreferenceErrors, type Preferences } from "@/lib/discover";
import { photoCountError, validateProfile, type ProfileErrors, type ProfileInput } from "@/lib/profile";
import { getUser } from "@/lib/supabase/server";

export type SaveResult = { ok: true } | { ok: false; errors: ProfileErrors & PreferenceErrors; message?: string };

export async function saveProfile(input: ProfileInput, preferences: Preferences): Promise<SaveResult> {
  const { supabase, user } = await getUser();
  if (!user) redirect("/entrar");

  const errors = { ...validateProfile(input), ...validatePreferences(preferences) };
  if (Object.keys(errors).length > 0) return { ok: false, errors };

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
    // Se conserva la fecha del primer consentimiento.
    sensitive_data_consent_at: existing?.sensitive_data_consent_at ?? new Date().toISOString(),
  });
  if (error) return { ok: false, errors: {}, message: "No pudimos guardar el perfil. Inténtalo de nuevo." };
  return { ok: true };
}

export async function signOut() {
  const { supabase } = await getUser();
  await supabase.auth.signOut();
  redirect("/");
}
