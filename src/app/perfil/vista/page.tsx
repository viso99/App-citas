import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { interestChips } from "@/lib/interests";
import { ageOn, parseDate } from "@/lib/profile";
import { extrasLabels, PROMPTS, type PromptAnswer } from "@/lib/profileExtras";
import { PHOTOS_BUCKET } from "@/lib/supabase/config";
import { getUser } from "@/lib/supabase/server";
import type { Card } from "../../descubrir/cards";
import { PreviewCard } from "./PreviewCard";

// "Ver mi perfil como lo ven los demás" (D-33): tu tarjeta tal como sale en Descubrir.
export default function PreviewPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center gap-3">
        <Link href="/perfil" aria-label="Volver al perfil" className="text-2xl text-zinc-500">
          ‹
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Así te ven</h1>
      </div>
      <Suspense fallback={<p className="text-zinc-500">Cargando…</p>}>
        <Preview />
      </Suspense>
    </main>
  );
}

async function Preview() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/entrar");

  const [{ data: p }, { data: photoRows }, { data: verification }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("profile_photos").select("storage_path").eq("user_id", user.id).order("position").order("created_at"),
    supabase.from("verifications").select("verified_at").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!p) redirect("/perfil");

  const paths = (photoRows ?? []).map((r) => r.storage_path as string);
  const urls = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage.from(PHOTOS_BUCKET).createSignedUrls(paths, 3600);
    signed?.forEach((s) => s.path && s.signedUrl && urls.set(s.path, s.signedUrl));
  }
  const birth = parseDate(p.birth_date);
  const age = birth ? ageOn(birth, new Date()) : 0;

  const card: Card = {
    id: user.id,
    firstName: p.first_name,
    age,
    bio: p.bio ?? "",
    distanceKm: 0,
    photos: paths.map((x) => urls.get(x)).filter((u): u is string => Boolean(u)),
    interests: interestChips(p.interests ?? [], []),
    superlikedMe: false,
    verified: Boolean(verification?.verified_at),
    details: extrasLabels({
      heightCm: p.height_cm,
      job: p.job ?? "",
      studies: p.studies,
      smoking: p.smoking,
      drinking: p.drinking,
      children: p.children,
    }),
    prompts: ((p.prompts ?? []) as PromptAnswer[])
      .filter((x) => Object.prototype.hasOwnProperty.call(PROMPTS, x.key))
      .map((x) => ({ question: PROMPTS[x.key as keyof typeof PROMPTS], answer: x.answer })),
    noteToMe: null,
    activeRecently: true,
  };

  return (
    <>
      <p className="text-sm text-zinc-500">
        Toca la foto a la derecha o a la izquierda para pasar de una a otra. La distancia la ve cada persona según dónde
        esté. Las aficiones que tengáis en común le saldrán en color.
      </p>
      <PreviewCard card={card} />
      <Link href="/perfil" className="self-center rounded-full bg-rose-600 px-6 py-3 font-semibold text-white">
        Editar mi perfil
      </Link>
    </>
  );
}
