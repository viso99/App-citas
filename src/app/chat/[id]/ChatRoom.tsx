"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  chatFolder,
  cleanMessage,
  isRead,
  MESSAGE_MAX,
  TYPING_SEND_EVERY_MS,
  TYPING_SHOWN_MS,
} from "@/lib/chat";
import { validatePhoto } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import { CHAT_PHOTOS_BUCKET } from "@/lib/supabase/config";

export type Message = {
  id: string;
  sender_id: string;
  body: string;
  image_path: string | null;
  created_at: string;
};

const COLUMNS = "id, sender_id, body, image_path, created_at";
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Hora de la península, igual en el servidor y en el móvil (si no, el texto no coincide al cargar).
const timeFormat = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

export function ChatRoom({
  me,
  userA,
  userB,
  otherName,
  initialMessages,
  initialOtherSeenAt,
}: {
  me: string;
  userA: string;
  userB: string;
  otherName: string;
  initialMessages: Message[];
  initialOtherSeenAt: string | null;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherSeenAt, setOtherSeenAt] = useState(initialOtherSeenAt);
  const [otherTyping, setOtherTyping] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const channel = useRef<RealtimeChannel | null>(null);
  const lastTypingSent = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const otherId = userA === me ? userB : userA;

  // Al abrir el chat y con cada mensaje que llega, la coincidencia queda vista (D-19).
  useEffect(() => {
    createClient().rpc("mark_match_seen", { other: otherId }).then(() => undefined);
  }, [otherId, messages.length]);

  function add(message: Message) {
    setMessages((current) => (current.some((m) => m.id === message.id) ? current : [...current, message]));
  }

  // Tiempo real: mensajes nuevos, cuándo la otra persona vio el chat ("Leído") y "está
  // escribiendo…" (D-22). La base solo envía los cambios de esta coincidencia a sus dos personas.
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`chat:${userA}:${userB}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `user_a=eq.${userA}` },
        (payload) => {
          const row = payload.new as Message & { user_b: string };
          if (row.user_b !== userB) return;
          add(row);
          if (row.sender_id !== me) setOtherTyping(false);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `user_a=eq.${userA}` },
        (payload) => {
          const row = payload.new as { user_b: string; a_seen_at: string | null; b_seen_at: string | null };
          if (row.user_b !== userB) return;
          setOtherSeenAt(userA === me ? row.b_seen_at : row.a_seen_at);
        },
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if ((payload as { from?: string })?.from !== otherId) return;
        setOtherTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setOtherTyping(false), TYPING_SHOWN_MS);
      })
      .subscribe();
    channel.current = ch;
    return () => {
      channel.current = null;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      supabase.removeChannel(ch);
    };
  }, [userA, userB, me, otherId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, otherTyping]);

  function onType(value: string) {
    setText(value);
    const now = Date.now();
    if (value.trim() && now - lastTypingSent.current > TYPING_SEND_EVERY_MS) {
      lastTypingSent.current = now;
      channel.current?.send({ type: "broadcast", event: "typing", payload: { from: me } });
    }
  }

  async function insert(body: string, imagePath: string | null) {
    const { data, error } = await createClient()
      .from("messages")
      .insert({ user_a: userA, user_b: userB, sender_id: me, body, image_path: imagePath })
      .select(COLUMNS)
      .single();
    if (error || !data) return false;
    add(data as Message);
    return true;
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const body = cleanMessage(text);
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const ok = await insert(body, null);
    setSending(false);
    if (!ok) return setError("No pudimos enviar el mensaje. Inténtalo de nuevo.");
    setText("");
    lastTypingSent.current = 0;
  }

  async function sendPhoto(file: File) {
    const problem = validatePhoto(file);
    if (problem) return setError(problem);
    setSending(true);
    setError(null);
    const supabase = createClient();
    const path = `${chatFolder(me, otherId)}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
    const upload = await supabase.storage.from(CHAT_PHOTOS_BUCKET).upload(path, file, { contentType: file.type });
    const ok = !upload.error && (await insert("", path));
    if (!ok && !upload.error) await supabase.storage.from(CHAT_PHOTOS_BUCKET).remove([path]);
    setSending(false);
    if (!ok) setError("No pudimos enviar la foto. Inténtalo de nuevo.");
  }

  // "Leído" o "Enviado" solo bajo mi último mensaje.
  const lastMine = [...messages].reverse().find((m) => m.sender_id === me);

  return (
    <>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="m-auto text-center text-zinc-500">
            Os habéis gustado. Escribe a {otherName} para empezar la conversación.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} className={`flex max-w-[80%] flex-col ${mine ? "self-end items-end" : "self-start"}`}>
              <div
                className={`rounded-2xl px-4 py-2 ${
                  mine ? "bg-rose-600 text-white" : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                }`}
              >
                {m.image_path && <ChatImage path={m.image_path} />}
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                <p className={`text-right text-xs ${mine ? "text-white/70" : "text-zinc-500"}`}>
                  {timeFormat.format(new Date(m.created_at))}
                </p>
              </div>
              {m === lastMine && (
                <span className="mt-0.5 text-xs text-zinc-500">
                  {isRead(m.created_at, otherSeenAt) ? "Leído" : "Enviado"}
                </span>
              )}
            </div>
          );
        })}
        {otherTyping && <p className="self-start text-sm italic text-zinc-500">{otherName} está escribiendo…</p>}
        <div ref={bottom} />
      </div>
      {error && <p className="px-4 text-sm text-red-600">{error}</p>}
      <form onSubmit={send} className="flex items-center gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
        <label
          aria-label="Enviar una foto"
          className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-300 text-xl dark:border-zinc-700 ${
            sending ? "opacity-50" : ""
          }`}
        >
          📷
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={sending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) sendPhoto(file);
            }}
          />
        </label>
        <input
          value={text}
          onChange={(e) => onType(e.target.value)}
          maxLength={MESSAGE_MAX}
          placeholder="Escribe un mensaje…"
          aria-label="Mensaje"
          className="min-w-0 flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-rose-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !cleanMessage(text)}
          className="rounded-full bg-rose-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </>
  );
}

// Foto del chat: almacenamiento privado, con un enlace firmado de una hora.
function ChatImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    createClient()
      .storage.from(CHAT_PHOTOS_BUCKET)
      .createSignedUrl(path, 3600)
      .then(({ data }) => alive && setUrl(data?.signedUrl ?? null));
    return () => {
      alive = false;
    };
  }, [path]);
  if (!url) return <div className="mb-1 h-48 w-48 animate-pulse rounded-xl bg-black/10" />;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element -- enlace firmado y temporal */}
      <img src={url} alt="Foto enviada en el chat" className="mb-1 max-h-72 rounded-xl object-cover" />
    </a>
  );
}
