import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isUuid, pairOf } from "@/lib/chat";
import { PHOTOS_BUCKET } from "@/lib/supabase/config";
import { getUser } from "@/lib/supabase/server";
import { ChatRoom, type Message } from "./ChatRoom";
import { ChatSafety } from "./ChatSafety";

export default function ChatPage(props: PageProps<"/chat/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-zinc-500">Cargando…</p>}>
      <Chat params={props.params} />
    </Suspense>
  );
}

type MatchRow = { id: string; first_name: string; photo_path: string | null };

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
  const [{ data: rows }, signed] = await Promise.all([
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("user_a", userA)
      .eq("user_b", userB)
      .order("created_at", { ascending: false })
      .limit(200),
    other.photo_path
      ? supabase.storage.from(PHOTOS_BUCKET).createSignedUrl(other.photo_path, 3600)
      : Promise.resolve(null),
  ]);
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
        <ChatSafety targetId={other.id} name={other.first_name} />
      </header>
      <ChatRoom me={user.id} userA={userA} userB={userB} otherName={other.first_name} initialMessages={messages} />
    </div>
  );
}
