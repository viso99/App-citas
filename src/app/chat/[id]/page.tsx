import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isUuid, MESSAGE_COLUMNS, pairOf } from "@/lib/chat";
import { PHOTOS_BUCKET } from "@/lib/supabase/config";
import { getUser } from "@/lib/supabase/server";
import { icebreakers } from "@/lib/icebreakers";
import type { PromptAnswer } from "@/lib/profileExtras";
import { ChatRoom, type Message } from "./ChatRoom";
import { ChatSafety } from "./ChatSafety";
import { ShareDate } from "./ShareDate";

export default function ChatPage(props: PageProps<"/chat/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-zinc-500">Cargando…</p>}>
      <Chat params={props.params} />
    </Suspense>
  );
}

type MatchRow = { id: string; first_name: string; age: number | null; photo_path: string | null };

async function Chat({ params }: { params: Promise<{ id: string }> }) {
  const { id: otherId } = await params;
  const { supabase, user } = await getUser();
  if (!user) redirect("/entrar");
  if (!isUuid(otherId)) redirect("/coincidencias");

  // Solo se entra al chat de una coincidencia propia (la base también lo exige).
  const { data: matches } = await supabase.rpc("my_matches");
  const other = ((matches ?? []) as MatchRow[]).find((m) => m.id === otherId.toLowerCase());
  if (!other) redirect("/coincidencias");

  const { userA, userB } = pairOf(user.id, other.id);
  const [{ data: rows }, signed, { data: match }, { data: info }] = await Promise.all([
    supabase
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("user_a", userA)
      .eq("user_b", userB)
      .order("created_at", { ascending: false })
      .limit(200),
    other.photo_path
      ? supabase.storage.from(PHOTOS_BUCKET).createSignedUrl(other.photo_path, 3600)
      : Promise.resolve(null),
    supabase.from("matches").select("a_seen_at, b_seen_at").eq("user_a", userA).eq("user_b", userB).maybeSingle(),
    // Para las ideas del primer mensaje (D-29).
    supabase.rpc("icebreaker_info", { other: other.id }),
    // Chatear también cuenta para "Activo hace poco" (D-28).
    supabase.rpc("touch_activity"),
  ]);
  const shared = ((info ?? []) as { shared_interests: string[] | null; prompts: PromptAnswer[] | null }[])[0];
  const ideas = icebreakers(shared?.shared_interests ?? [], shared?.prompts ?? []);
  // Cuándo abrió el chat la otra persona por última vez, para el "Leído" (D-22).
  const otherSeenAt: string | null = (userA === user.id ? match?.b_seen_at : match?.a_seen_at) ?? null;
  const messages = ((rows ?? []) as Message[]).reverse();

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col">
      <header className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <Link href="/coincidencias" aria-label="Volver a coincidencias" className="text-2xl text-zinc-500">
          ‹
        </Link>
        {signed?.data?.signedUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- enlace firmado y temporal
          <img src={signed.data.signedUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
        )}
        <h1 className="text-lg font-semibold">{other.first_name}</h1>
        <ShareDate name={other.first_name} age={other.age} />
        <ChatSafety targetId={other.id} name={other.first_name} />
      </header>
      <ChatRoom
        me={user.id}
        userA={userA}
        userB={userB}
        otherName={other.first_name}
        initialMessages={messages}
        initialOtherSeenAt={otherSeenAt}
        ideas={ideas}
      />
    </div>
  );
}
