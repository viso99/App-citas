import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppNav } from "@/components/AppNav";
import { getUser } from "@/lib/supabase/server";
import { loadCards } from "../cards";
import { SwipeDeck } from "../SwipeDeck";

// "Les gustas" (D-25): las personas que te dieron "me gusta", para contestar rápido.
export default function LikesPage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
        <div className="flex items-center gap-3">
          <Link href="/descubrir" aria-label="Volver a Descubrir" className="text-2xl text-zinc-500">
            ‹
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Les gustas</h1>
        </div>
        <Suspense fallback={<p className="text-zinc-500">Cargando…</p>}>
          <Likes />
        </Suspense>
      </main>
      <AppNav current="descubrir" />
    </>
  );
}

async function Likes() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/entrar");
  const [cards, { data: left }] = await Promise.all([loadCards(supabase, true), supabase.rpc("superlikes_left")]);
  return <SwipeDeck initialCards={cards} initialSuperlikes={typeof left === "number" ? left : 0} onlyLikers />;
}
