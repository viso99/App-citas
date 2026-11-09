"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Registro e inicio de sesión con correo y código (D-7): la misma pantalla sirve para las
// dos cosas. Si el correo no tiene cuenta, Supabase la crea al verificar el código.
// Mientras no haya un servicio de correo propio, el correo trae un enlace en vez del código:
// el enlace lleva a /auth/confirmar, que inicia la sesión.
export default function EnterPage() {
  return (
    <Suspense>
      <EnterForm />
    </Suspense>
  );
}

function EnterForm() {
  const router = useRouter();
  const linkFailed = useSearchParams().get("error") === "enlace";
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirmar` },
    });
    setBusy(false);
    if (error) {
      setError("No pudimos enviar el correo. Revisa el correo e inténtalo de nuevo.");
      return;
    }
    setStep("code");
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) {
      setError("El código no es correcto o ha caducado.");
      return;
    }
    router.replace("/descubrir");
    router.refresh();
  }

  const input =
    "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-lg text-zinc-900 focus:border-rose-500 focus:outline-none";
  const button =
    "w-full rounded-full bg-rose-600 px-6 py-3 text-lg font-semibold text-white hover:bg-rose-700 disabled:opacity-50";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Entrar</h1>
      {step === "email" ? (
        <form onSubmit={sendCode} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-zinc-600 dark:text-zinc-300">Tu correo electrónico</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
            />
          </label>
          <button type="submit" disabled={busy} className={button}>
            {busy ? "Enviando…" : "Continuar"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-4">
          <p className="text-zinc-600 dark:text-zinc-300">
            Te hemos enviado un correo a <strong>{email}</strong>. Abre el enlace en este mismo navegador, o
            escribe aquí el código si te ha llegado uno.
          </p>
          <label className="flex flex-col gap-2">
            <span className="text-zinc-600 dark:text-zinc-300">Código</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              pattern="[0-9]{6,10}"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={`${input} tracking-widest`}
            />
          </label>
          <button type="submit" disabled={busy} className={button}>
            {busy ? "Comprobando…" : "Entrar"}
          </button>
          <button type="button" onClick={() => setStep("email")} className="text-zinc-500 underline">
            Usar otro correo
          </button>
        </form>
      )}
      {linkFailed && !error && step === "email" && (
        <p className="text-red-600">El enlace no es válido o ha caducado. Pide uno nuevo.</p>
      )}
      {error && <p className="text-red-600">{error}</p>}
    </main>
  );
}
