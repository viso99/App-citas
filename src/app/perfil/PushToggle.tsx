"use client";

import { useEffect, useState } from "react";
import { base64UrlToBytes } from "@/lib/push";
import { createClient } from "@/lib/supabase/client";

type State = "loading" | "unsupported" | "off" | "on" | "denied" | "busy";

// Activar o quitar los avisos en este móvil (D-24).
export function PushToggle({ userId }: { userId: string }) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);

  // Qué permite este navegador y si ya hay avisos activos (solo se sabe en el navegador).
  useEffect(() => {
    let alive = true;
    const check = async (): Promise<State> => {
      if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return "unsupported";
      }
      if (Notification.permission === "denied") return "denied";
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (!sub) return "off";
      // El móvil puede tener avisos activos de otra cuenta que entró antes: solo cuentan los míos.
      const { data } = await createClient()
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .eq("endpoint", sub.endpoint)
        .maybeSingle();
      return data ? "on" : "off";
    };
    check()
      .catch((): State => "off")
      .then((s) => alive && setState(s));
    return () => {
      alive = false;
    };
  }, [publicKey, userId]);

  async function enable() {
    if (!publicKey) return;
    setState("busy");
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) }));
      const json = sub.toJSON();
      // Si el móvil estaba a nombre de otra cuenta, pasa a esta (así no recibe avisos ajenos).
      const { error } = await createClient().rpc("save_push_subscription", {
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      if (error) throw error;
      setState("on");
    } catch {
      setError("No pudimos activar los avisos en este móvil.");
      setState("off");
    }
  }

  async function disable() {
    setState("busy");
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await createClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setError("No pudimos quitar los avisos.");
      setState("on");
    }
  }

  const box = "flex flex-col gap-2 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800";
  if (state === "loading") return null;
  return (
    <section className={box}>
      <span className="font-medium">Avisos en el móvil</span>
      {state === "unsupported" && (
        <span className="text-sm text-zinc-500">
          Este navegador no permite avisos. En iPhone, primero añade Zuvi a la pantalla de inicio y ábrelo desde ahí.
        </span>
      )}
      {state === "denied" && (
        <span className="text-sm text-zinc-500">
          Has bloqueado los avisos de Zuvi. Puedes permitirlos en los ajustes del navegador.
        </span>
      )}
      {(state === "off" || state === "on" || state === "busy") && (
        <>
          <span className="text-sm text-zinc-500">
            Te avisamos cuando tengas una coincidencia o un mensaje nuevo, sin enseñar nombres ni mensajes.
          </span>
          <button
            type="button"
            onClick={state === "on" ? disable : enable}
            disabled={state === "busy"}
            className={`w-fit rounded-full px-5 py-2 font-semibold disabled:opacity-50 ${
              state === "on" ? "border border-zinc-300 dark:border-zinc-700" : "bg-rose-600 text-white"
            }`}
          >
            {state === "busy" ? "Un momento…" : state === "on" ? "Quitar avisos en este móvil" : "Activar avisos"}
          </button>
        </>
      )}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </section>
  );
}
