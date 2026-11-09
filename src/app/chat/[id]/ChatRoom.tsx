"use client";

import { useEffect, useRef, useState } from "react";
import { cleanMessage, MESSAGE_MAX } from "@/lib/chat";
import { createClient } from "@/lib/supabase/client";

export type Message = { id: string; sender_id: string; body: string; created_at: string };

// Hora de la península, igual en el servidor y en el móvil (si no, el texto no coincide al cargar).
const timeFormat = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

export function ChatRoom({
  me,
  userA,
  userB,
  otherName,
  initialMessages,
}: {
  me: string;
  userA: string;
  userB: string;
  otherName: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  function add(message: Message) {
    setMessages((current) => (current.some((m) => m.id === message.id) ? current : [...current, message]));
  }

  // Mensajes nuevos en tiempo real. La base solo envía los de esta coincidencia a sus dos personas.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${userA}:${userB}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `user_a=eq.${userA}` },
        (payload) => {
          const row = payload.new as Message & { user_b: string };
          if (row.user_b === userB) add(row);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userA, userB]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const body = cleanMessage(text);
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const { data, error } = await createClient()
      .from("messages")
      .insert({ user_a: userA, user_b: userB, sender_id: me, body })
      .select("id, sender_id, body, created_at")
      .single();
    setSending(false);
    if (error || !data) {
      setError("No pudimos enviar el mensaje. Inténtalo de nuevo.");
      return;
    }
    add(data as Message);
    setText("");
  }

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
            <div
              key={m.id}
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                mine
                  ? "self-end bg-rose-600 text-white"
                  : "self-start bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className={`text-right text-xs ${mine ? "text-white/70" : "text-zinc-500"}`}>
                {timeFormat.format(new Date(m.created_at))}
              </p>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      {error && <p className="px-4 text-sm text-red-600">{error}</p>}
      <form onSubmit={send} className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MESSAGE_MAX}
          placeholder="Escribe un mensaje…"
          aria-label="Mensaje"
          className="flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-rose-500 focus:outline-none"
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
