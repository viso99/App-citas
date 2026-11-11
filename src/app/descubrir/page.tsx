import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppNav } from "@/components/AppNav";
import { getUser } from "@/lib/supabase/server";
import { activeTravelCity, TRAVEL_CITIES } from "@/lib/travel";
import { loadCards } from "./cards";
import { NeedsLocation } from "./NeedsLocation";
import { SwipeDeck } from "./SwipeDeck";

export default function DiscoverPage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight">Descubrir</h1>
        <Suspense fallback={<p className="text-zinc-500">Cargando…</p>}>
          <Discover />
        </Suspense>
      </main>
      <AppNav current="descubrir" />
    </>
  );
}

async function Discover() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/entrar");

  const { data: profile } = await supabase.from("profiles").select("lat, paused, travel_city, travel_started_at").eq("id", user.id).maybeSingle();
  // Sin perfil no se puede descubrir: primero la bienvenida y después el perfil (D-34).
  if (!profile) redirect("/bienvenida");
  if (profile.lat === null) return <NeedsLocation />;

  const [cards, { data: left }, { data: likes }] = await Promise.all([
    loadCards(supabase),
    supabase.rpc("superlikes_left"),
    supabase.rpc("likes_me_count"),
  ]);
  const travel = activeTravelCity(profile.travel_city, profile.travel_started_at);
  const likesCount = typeof likes === "number" ? likes : 0;
  return (
    <>
      {profile.paused && (
        <p className="rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-900">
          Tu perfil está en pausa: nadie nuevo te ve en Descubrir.{" "}
          <Link href="/perfil" className="underline">
            Quitar la pausa
          </Link>
        </p>
      )}
      {travel && (
        <p className="rounded-2xl bg-sky-100 px-4 py-3 text-sm text-sky-900">
          <span aria-hidden>✈️ </span>Estás de viaje en {TRAVEL_CITIES[travel].name}.{" "}
          <Link href="/perfil" className="underline">
            Cambiar
          </Link>
        </p>
      )}
      {likesCount > 0 && <LikesBanner count={likesCount} />}
      <SwipeDeck initialCards={cards} initialSuperlikes={typeof left === "number" ? left : 0} />
    </>
  );
}

// Aviso de "Les gustas" (D-25): cuántas personas te dieron "me gusta" y aún no has contestado.
function LikesBanner({ count }: { count: number }) {
  return (
    <Link
      href="/descubrir/les-gustas"
      className="flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-3 font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-200"
    >
      <span>♥ Les gustas a {count === 1 ? "1 persona" : `${count} personas`}</span>
      <span aria-hidden>›</span>
    </Link>
  );
}
