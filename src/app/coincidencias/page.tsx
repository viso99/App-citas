import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppNav } from "@/components/AppNav";
import { PHOTOS_BUCKET } from "@/lib/supabase/config";
import { getUser } from "@/lib/supabase/server";

export default function MatchesPage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight">Coincidencias</h1>
        <Suspense fallback={<p className="text-zinc-500">Cargando…</p>}>
          <Matches />
        </Suspense>
      </main>
      <AppNav current="coincidencias" />
    </>
  );
}

type Row = {
  id: string;
  first_name: string;
  age: number;
  photo_path: string | null;
  matched_at: string;
  last_message: string | null;
  last_message_mine: boolean | null;
};

const dateFormat = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", timeZone: "Europe/Madrid" });

async function Matches() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/entrar");

  const { data, error } = await supabase.rpc("my_matches");
  if (error) return <p className="text-red-600">No pudimos cargar tus coincidencias. Inténtalo de nuevo.</p>;
  const rows = (data ?? []) as Row[];

  if (rows.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg">Todavía no tienes coincidencias.</p>
        <p className="text-zinc-600 dark:text-zinc-300">
          Cuando a alguien que te gusta también le gustes, aparecerá aquí.
        </p>
        <Link href="/descubrir" className="text-rose-600 underline">
          Seguir descubriendo
        </Link>
      </div>
    );
  }

  // Las fotos son privadas: enlaces firmados de una hora.
  const paths = rows.map((r) => r.photo_path).filter((p): p is string => Boolean(p));
  const urls = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage.from(PHOTOS_BUCKET).createSignedUrls(paths, 3600);
    signed?.forEach((s) => s.path && s.signedUrl && urls.set(s.path, s.signedUrl));
  }

  return (
    <ul className="grid grid-cols-2 gap-3">
      {rows.map((r) => {
        const url = r.photo_path ? urls.get(r.photo_path) : undefined;
        return (
          <li key={r.id}>
            <Link
              href={`/chat/${r.id}`}
              className="relative block aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-200"
            >
              {url && (
                // eslint-disable-next-line @next/next/no-img-element -- enlaces firmados y temporales
                <img src={url} alt="" className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10 text-white">
                <p className="font-semibold">
                  {r.first_name}, {r.age}
                </p>
                <p className="truncate text-xs text-white/80">
                  {r.last_message
                    ? `${r.last_message_mine ? "Tú: " : ""}${r.last_message}`
                    : `Desde el ${dateFormat.format(new Date(r.matched_at))} · Escríbele`}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
