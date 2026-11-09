import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppNav } from "@/components/AppNav";
import { DEFAULT_DISTANCE_KM, DEFAULT_MAX_AGE, DEFAULT_MIN_AGE } from "@/lib/discover";
import { PHOTOS_BUCKET } from "@/lib/supabase/config";
import { getUser } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { DeleteAccount } from "./DeleteAccount";
import { ProfileForm, type Photo } from "./ProfileForm";

export default function ProfilePage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Tu perfil</h1>
          <form action={signOut}>
            <button type="submit" className="text-zinc-500 underline">
              Salir
            </button>
          </form>
        </div>
        <Suspense fallback={<p className="text-zinc-500">Cargando…</p>}>
          <Profile />
        </Suspense>
        <DeleteAccount />
      </main>
      <AppNav current="perfil" />
    </>
  );
}

async function Profile() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/entrar");

  const [{ data: profile }, { data: photoRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("profile_photos").select("id, storage_path").eq("user_id", user.id).order("position"),
  ]);

  // Las fotos son privadas: se muestran con enlaces firmados que caducan en una hora.
  let photos: Photo[] = [];
  if (photoRows && photoRows.length > 0) {
    const { data: signed } = await supabase.storage.from(PHOTOS_BUCKET).createSignedUrls(
      photoRows.map((p) => p.storage_path),
      3600,
    );
    photos = photoRows.map((p, i) => ({
      id: p.id,
      path: p.storage_path,
      url: signed?.[i]?.signedUrl ?? null,
    }));
  }

  return (
    <ProfileForm
      userId={user.id}
      initialPhotos={photos}
      hasProfile={Boolean(profile)}
      locationUpdatedAt={profile?.location_updated_at ?? null}
      initialPreferences={{
        minAge: profile?.min_age ?? DEFAULT_MIN_AGE,
        maxAge: profile?.max_age ?? DEFAULT_MAX_AGE,
        maxDistanceKm: profile?.max_distance_km ?? DEFAULT_DISTANCE_KM,
      }}
      initial={{
        firstName: profile?.first_name ?? "",
        birthDate: profile?.birth_date ?? "",
        bio: profile?.bio ?? "",
        gender: profile?.gender ?? "",
        interestedIn: profile?.interested_in ?? "",
        sensitiveConsent: Boolean(profile?.sensitive_data_consent_at),
      }}
    />
  );
}
