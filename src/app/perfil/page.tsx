import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppNav } from "@/components/AppNav";
import { extrasFromRow } from "@/lib/profileExtras";
import { DEFAULT_DISTANCE_KM, DEFAULT_MAX_AGE, DEFAULT_MIN_AGE } from "@/lib/discover";
import { PHOTOS_BUCKET } from "@/lib/supabase/config";
import { getUser } from "@/lib/supabase/server";
import { BlockedList } from "./BlockedList";
import { Verification } from "./Verification";
import { PushToggle } from "./PushToggle";
import { SignOutButton } from "./SignOutButton";
import { PauseToggle } from "./PauseToggle";
import { TravelMode } from "./TravelMode";
import { activeTravelCity } from "@/lib/travel";
import { DeleteAccount } from "./DeleteAccount";
import { ProfileForm, type Photo } from "./ProfileForm";

export default function ProfilePage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Tu perfil</h1>
          <SignOutButton />
        </div>
        <Suspense fallback={<p className="text-zinc-500">Cargando…</p>}>
          <Profile />
        </Suspense>
        <Suspense fallback={null}>
          <ProfileExtrasBox />
        </Suspense>
        <Suspense fallback={null}>
          <Verification />
        </Suspense>
        <Suspense fallback={null}>
          <Push />
        </Suspense>
        <Suspense fallback={null}>
          <BlockedList />
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
    supabase.from("profile_photos").select("id, storage_path").eq("user_id", user.id).order("position").order("created_at"),
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
      initialMore={{
        extras: extrasFromRow(profile),
        prompts: profile?.prompts ?? [],
        filters: {
          onlyNonSmokers: profile?.filter_non_smokers ?? false,
          onlyWantsChildren: profile?.filter_wants_children ?? false,
          onlyVerified: profile?.filter_verified ?? false,
          onlySameGoal: profile?.filter_same_goal ?? false,
        },
      }}
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
        interests: profile?.interests ?? [],
      }}
    />
  );
}

// "Ver mi perfil como lo ven los demás" (D-33), "Pausar mi perfil" (D-27), modo viaje (D-39) y
// descargar mis datos (D-42). Solo con perfil creado.
async function ProfileExtrasBox() {
  const { supabase, user } = await getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("paused, travel_city, travel_started_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) return null;
  return (
    <>
      <Link
        href="/perfil/vista"
        className="rounded-2xl border border-zinc-200 p-4 font-medium dark:border-zinc-800"
      >
        👀 Ver mi perfil como lo ven los demás <span aria-hidden>›</span>
      </Link>
      <PauseToggle initialPaused={data.paused === true} />
      <TravelMode initialCity={activeTravelCity(data.travel_city, data.travel_started_at)} />
      <a
        href="/perfil/mis-datos"
        download
        className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <span className="font-medium">📦 Descargar mis datos</span>
        <span className="block text-sm text-zinc-500">
          Un archivo con todo lo que Zuvi guarda de ti: perfil, fotos, me gusta, coincidencias y tus mensajes.
        </span>
      </a>
    </>
  );
}

async function Push() {
  const { user } = await getUser();
  return user ? <PushToggle userId={user.id} /> : null;
}
