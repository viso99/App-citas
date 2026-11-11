"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  AUDIO_MAX_SECONDS,
  audioType,
  chatFolder,
  cleanMessage,
  formatSeconds,
  isRead,
  MESSAGE_COLUMNS,
  MESSAGE_MAX,
  messagePreview,
  REACTIONS,
  TYPING_SEND_EVERY_MS,
  TYPING_SHOWN_MS,
} from "@/lib/chat";
import { validatePhoto } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import { CHAT_PHOTOS_BUCKET } from "@/lib/supabase/config";
import { notifyMessage } from "./actions";

export type Message = {
  id: string;
  sender_id: string;
  body: string;
  image_path: string | null;
  audio_path: string | null;
  a_reaction: string | null;
  b_reaction: string | null;
  deleted_at: string | null;
  // Mensaje al que responde (D-37).
  reply_to: string | null;
  created_at: string;
};

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Hora de la península, igual en el servidor y en el móvil (si no, el texto no coincide al cargar).
const timeFormat = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

type Recording = { recorder: MediaRecorder; stream: MediaStream; startedAt: number; cancelled: boolean };

export function ChatRoom({
  me,
  userA,
  userB,
  otherName,
  initialMessages,
  initialOtherSeenAt,
  ideas,
}: {
  me: string;
  userA: string;
  userB: string;
  otherName: string;
  initialMessages: Message[];
  initialOtherSeenAt: string | null;
  // Ideas para el primer mensaje (D-29).
  ideas: string[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherSeenAt, setOtherSeenAt] = useState(initialOtherSeenAt);
  const [otherTyping, setOtherTyping] = useState(false);
  // Mensaje tocado: muestra las reacciones (si es de la otra persona) o "Borrar" (si es mío).
  const [selected, setSelected] = useState<string | null>(null);
  // Mensaje al que se va a responder (D-37).
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [recordingFor, setRecordingFor] = useState(0);
  const [recording, setRecording] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const channel = useRef<RealtimeChannel | null>(null);
  const lastTypingSent = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rec = useRef<Recording | null>(null);

  const otherId = userA === me ? userB : userA;
  const iAmA = userA === me;

  // Al abrir el chat y con cada mensaje que llega, la coincidencia queda vista (D-19).
  useEffect(() => {
    createClient().rpc("mark_match_seen", { other: otherId }).then(() => undefined);
  }, [otherId, messages.length]);

  function upsert(message: Message) {
    setMessages((current) =>
      current.some((m) => m.id === message.id)
        ? current.map((m) => (m.id === message.id ? { ...m, ...message } : m))
        : [...current, message],
    );
  }

  // Tiempo real: mensajes nuevos y cambios (reacciones, borrados), cuándo la otra persona vio el
  // chat ("Leído") y "está escribiendo…" (D-22). La base solo envía los de esta coincidencia.
  useEffect(() => {
    const supabase = createClient();
    const onMessage = (payload: { new: unknown }) => {
      const row = payload.new as Message & { user_b: string };
      if (row.user_b !== userB) return;
      upsert(row);
      if (row.sender_id !== me) setOtherTyping(false);
    };
    const ch = supabase
      .channel(`chat:${userA}:${userB}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `user_a=eq.${userA}` }, onMessage)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `user_a=eq.${userA}` }, onMessage)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `user_a=eq.${userA}` },
        (payload) => {
          const row = payload.new as { user_b: string; a_seen_at: string | null; b_seen_at: string | null };
          if (row.user_b !== userB) return;
          setOtherSeenAt(iAmA ? row.b_seen_at : row.a_seen_at);
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
  }, [userA, userB, me, otherId, iAmA]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, otherTyping]);

  // Si se sale del chat grabando, se corta la grabación sin enviarla.
  useEffect(() => {
    return () => {
      if (rec.current) {
        rec.current.cancelled = true;
        rec.current.recorder.stop();
      }
    };
  }, []);

  // Contador de la grabación y corte automático al minuto (D-30).
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      const r = rec.current;
      if (!r) return;
      const seconds = (Date.now() - r.startedAt) / 1000;
      setRecordingFor(seconds);
      if (seconds >= AUDIO_MAX_SECONDS) stopRecording(false);
    }, 250);
    return () => clearInterval(timer);
  });

  function onType(value: string) {
    setText(value);
    const now = Date.now();
    if (value.trim() && now - lastTypingSent.current > TYPING_SEND_EVERY_MS) {
      lastTypingSent.current = now;
      channel.current?.send({ type: "broadcast", event: "typing", payload: { from: me } });
    }
  }

  async function insert(body: string, files: { image_path?: string; audio_path?: string } = {}) {
    const { data, error } = await createClient()
      .from("messages")
      .insert({ user_a: userA, user_b: userB, sender_id: me, body, reply_to: replyTo?.id ?? null, ...files })
      .select(MESSAGE_COLUMNS)
      .single();
    if (error || !data) return false;
    upsert(data as Message);
    setReplyTo(null);
    notifyMessage(otherId).catch(() => undefined);
    return true;
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const body = cleanMessage(text);
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const ok = await insert(body);
    setSending(false);
    if (!ok) return setError("No pudimos enviar el mensaje. Inténtalo de nuevo.");
    setText("");
    lastTypingSent.current = 0;
  }

  // Sube un archivo a la carpeta del chat y envía el mensaje; si falla, borra el archivo.
  async function sendFile(blob: Blob, contentType: string, ext: string, kind: "image_path" | "audio_path") {
    setSending(true);
    setError(null);
    const supabase = createClient();
    const path = `${chatFolder(me, otherId)}/${crypto.randomUUID()}.${ext}`;
    const upload = await supabase.storage.from(CHAT_PHOTOS_BUCKET).upload(path, blob, { contentType });
    const ok = !upload.error && (await insert("", { [kind]: path }));
    if (!ok && !upload.error) await supabase.storage.from(CHAT_PHOTOS_BUCKET).remove([path]);
    setSending(false);
    if (!ok) setError(kind === "audio_path" ? "No pudimos enviar el audio." : "No pudimos enviar la foto. Inténtalo de nuevo.");
  }

  async function sendPhoto(file: File) {
    const problem = validatePhoto(file);
    if (problem) return setError(problem);
    await sendFile(file, file.type, EXTENSIONS[file.type], "image_path");
  }

  // Notas de voz (D-30): pulsar 🎤 empieza a grabar; "Enviar" o el minuto la envían.
  async function startRecording() {
    setError(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return setError("Este navegador no permite grabar audio.");
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setError("Necesitamos permiso para usar el micrófono.");
    }
    const preferred = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((t) =>
      MediaRecorder.isTypeSupported(t),
    );
    const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
    const chunks: Blob[] = [];
    const current: Recording = { recorder, stream, startedAt: Date.now(), cancelled: false };
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      rec.current = null;
      setRecording(false);
      setRecordingFor(0);
      if (current.cancelled || chunks.length === 0) return;
      if ((Date.now() - current.startedAt) / 1000 < 1) return setError("El audio es demasiado corto.");
      const kind = audioType(recorder.mimeType || chunks[0].type);
      if (!kind) return setError("Este navegador graba el audio en un formato que no admitimos.");
      sendFile(new Blob(chunks, { type: kind.type }), kind.type, kind.ext, "audio_path");
    };
    rec.current = current;
    recorder.start();
    setRecording(true);
    setRecordingFor(0);
  }

  function stopRecording(cancel: boolean) {
    const r = rec.current;
    if (!r) return;
    r.cancelled = cancel;
    if (r.recorder.state !== "inactive") r.recorder.stop();
  }

  // Reacciones (D-31): solo a mensajes de la otra persona; el mismo emoji la quita.
  async function react(m: Message, emoji: string) {
    setSelected(null);
    const mine = iAmA ? m.a_reaction : m.b_reaction;
    const next = mine === emoji ? null : emoji;
    upsert({ ...m, [iAmA ? "a_reaction" : "b_reaction"]: next });
    const { error } = await createClient().rpc("react_to_message", { msg: m.id, emoji });
    if (error) {
      upsert(m);
      setError("No pudimos guardar la reacción.");
    }
  }

  // Borrar un mensaje propio para los dos (D-32), con su foto o audio.
  async function remove(m: Message) {
    setSelected(null);
    if (!window.confirm("¿Borrar este mensaje para los dos?")) return;
    const supabase = createClient();
    const { data, error } = await supabase.rpc("delete_message", { msg: m.id });
    if (error) return setError("No pudimos borrar el mensaje.");
    const files = (data ?? []) as string[];
    if (files.length > 0) await supabase.storage.from(CHAT_PHOTOS_BUCKET).remove(files);
    upsert({ ...m, body: "", image_path: null, audio_path: null, a_reaction: null, b_reaction: null, deleted_at: new Date().toISOString() });
  }

  function startReply(m: Message) {
    setSelected(null);
    setReplyTo(m);
    document.getElementById("chat-input")?.focus();
  }

  const byId = new Map(messages.map((m) => [m.id, m]));
  const author = (m: Message | undefined) => (m ? (m.sender_id === me ? "Tú" : otherName) : "");

  // "Leído" o "Enviado" solo bajo mi último mensaje.
  const lastMine = [...messages].reverse().find((m) => m.sender_id === me);

  return (
    <>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="m-auto flex flex-col items-center gap-3 text-center">
            <p className="text-zinc-500">Os habéis gustado. Escribe a {otherName} para empezar la conversación.</p>
            {ideas.length > 0 && (
              <>
                <p className="text-sm font-semibold text-zinc-500">Ideas para empezar:</p>
                {ideas.map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => onType(idea)}
                    className="rounded-2xl border border-rose-200 px-4 py-2 text-left text-sm text-rose-700 dark:border-rose-900 dark:text-rose-300"
                  >
                    {idea}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === me;
          const deleted = m.deleted_at !== null;
          // La reacción la pone quien recibe el mensaje.
          const reaction = m.sender_id === userA ? m.b_reaction : m.a_reaction;
          const isSelected = selected === m.id && !deleted;
          return (
            <div
              key={m.id}
              id={`msg-${m.id}`}
              className={`flex max-w-[80%] scroll-mt-4 flex-col ${mine ? "self-end items-end" : "self-start"}`}
            >
              <div className="relative">
                <div
                  role="button"
                  tabIndex={deleted ? -1 : 0}
                  onClick={() => !deleted && setSelected(isSelected ? null : m.id)}
                  onKeyDown={(e) => {
                    if (!deleted && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      setSelected(isSelected ? null : m.id);
                    }
                  }}
                  aria-label={deleted ? undefined : mine ? "Opciones del mensaje" : "Reaccionar al mensaje"}
                  className={`block cursor-pointer rounded-2xl px-4 py-2 text-left ${
                    deleted
                      ? "border border-zinc-300 italic text-zinc-500 dark:border-zinc-700"
                      : mine
                        ? "bg-rose-600 text-white"
                        : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  }`}
                >
                  {deleted ? (
                    <p>Mensaje eliminado</p>
                  ) : (
                    <>
                      {m.reply_to && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            document.getElementById(`msg-${m.reply_to}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }}
                          className={`mb-1 block w-full rounded-lg border-l-4 px-2 py-1 text-left text-sm ${
                            mine ? "border-white/70 bg-white/15 text-white/90" : "border-rose-500 bg-black/5 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"
                          }`}
                        >
                          <span className="block text-xs font-semibold">{author(byId.get(m.reply_to)) || "Respuesta a"}</span>
                          {messagePreview(byId.get(m.reply_to))}
                        </button>
                      )}
                      {m.image_path && <ChatImage path={m.image_path} />}
                      {m.audio_path && <ChatAudio path={m.audio_path} />}
                      {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                    </>
                  )}
                  <p className={`text-right text-xs ${mine && !deleted ? "text-white/70" : "text-zinc-500"}`}>
                    {timeFormat.format(new Date(m.created_at))}
                  </p>
                </div>
                {reaction && !deleted && (
                  <span
                    className={`absolute -bottom-3 ${mine ? "left-1" : "right-1"} rounded-full bg-white px-1.5 text-sm shadow dark:bg-zinc-900`}
                    aria-label={`Reacción: ${reaction}`}
                  >
                    {reaction}
                  </span>
                )}
              </div>
              {isSelected && !mine && (
                <div className="mt-1 flex gap-1 rounded-full bg-white px-2 py-1 shadow dark:bg-zinc-900" role="group" aria-label="Reacciones">
                  {REACTIONS.map((r) => (
                    <button key={r} type="button" onClick={() => react(m, r)} className="px-1 text-xl" aria-label={`Reaccionar con ${r}`}>
                      {r}
                    </button>
                  ))}
                </div>
              )}
              {isSelected && (
                <div className="mt-1 flex gap-4 text-sm">
                  <button type="button" onClick={() => startReply(m)} className="font-medium text-rose-600 underline">
                    Responder
                  </button>
                  {mine && (
                    <button type="button" onClick={() => remove(m)} className="text-red-600 underline">
                      Borrar para los dos
                    </button>
                  )}
                </div>
              )}
              {m === lastMine && !isSelected && (
                <span className={`text-xs text-zinc-500 ${reaction ? "mt-3" : "mt-0.5"}`}>
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
      {replyTo && (
        <div className="flex items-center gap-2 border-t border-zinc-200 px-4 py-2 dark:border-zinc-800">
          <div className="min-w-0 flex-1 border-l-4 border-rose-500 pl-2 text-sm">
            <span className="block text-xs font-semibold text-rose-600">
              Respondiendo a {replyTo.sender_id === me ? "ti" : otherName}
            </span>
            <span className="block truncate text-zinc-500">{messagePreview(replyTo)}</span>
          </div>
          <button type="button" onClick={() => setReplyTo(null)} aria-label="No responder" className="px-2 text-xl text-zinc-500">
            ×
          </button>
        </div>
      )}
      {recording ? (
        <div className="flex items-center gap-3 border-t border-zinc-200 p-3 dark:border-zinc-800">
          <span className="flex-1 font-medium text-red-600" aria-live="polite">
            <span aria-hidden>● </span>Grabando {formatSeconds(recordingFor)} / {formatSeconds(AUDIO_MAX_SECONDS)}
          </span>
          <button type="button" onClick={() => stopRecording(true)} className="rounded-full border border-zinc-300 px-4 py-2 dark:border-zinc-700">
            Cancelar
          </button>
          <button type="button" onClick={() => stopRecording(false)} className="rounded-full bg-rose-600 px-5 py-2 font-semibold text-white">
            Enviar
          </button>
        </div>
      ) : (
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
            id="chat-input"
            value={text}
            onChange={(e) => onType(e.target.value)}
            maxLength={MESSAGE_MAX}
            placeholder="Escribe un mensaje…"
            aria-label="Mensaje"
            className="min-w-0 flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-rose-500 focus:outline-none"
          />
          {cleanMessage(text) ? (
            <button type="submit" disabled={sending} className="rounded-full bg-rose-600 px-5 py-2 font-semibold text-white disabled:opacity-50">
              Enviar
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              disabled={sending}
              aria-label="Grabar una nota de voz"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-600 text-xl text-white disabled:opacity-50"
            >
              🎤
            </button>
          )}
        </form>
      )}
    </>
  );
}

// Enlace firmado de una hora a un archivo privado del chat.
function useSignedUrl(path: string) {
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
  return url;
}

function ChatImage({ path }: { path: string }) {
  const url = useSignedUrl(path);
  if (!url) return <div className="mb-1 h-48 w-48 animate-pulse rounded-xl bg-black/10" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- enlace firmado y temporal
    <img src={url} alt="Foto enviada en el chat" className="mb-1 max-h-72 rounded-xl object-cover" />
  );
}

function ChatAudio({ path }: { path: string }) {
  const url = useSignedUrl(path);
  if (!url) return <div className="mb-1 h-10 w-56 animate-pulse rounded-full bg-black/10" />;
  return (
    <audio
      controls
      preload="metadata"
      src={url}
      onClick={(e) => e.stopPropagation()}
      className="mb-1 h-10 w-56 max-w-full"
      aria-label="Nota de voz"
    />
  );
}
