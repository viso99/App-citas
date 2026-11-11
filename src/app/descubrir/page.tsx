import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppNav } from "@/components/AppNav";
import { getUser } from "@/lib/supabase/server";
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

  const { data: profile } = await supabase.from("profiles").select("lat").eq("id", user.id).maybeSingle();
  // Sin perfil no se puede descubrir: primero hay que completarlo.
  if (!profile) redirect("/perfil");
  if (profile.lat === null) return <NeedsLocation />;

  const [cards, { data: left }] = await Promise.all([loadCards(supabase), supabase.rpc("superlikes_left")]);
  return <SwipeDeck initialCards={cards} initialSuperlikes={typeof left === "number" ? left : 0} />;
}
