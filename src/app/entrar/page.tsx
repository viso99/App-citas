"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Registro e inicio de sesión con correo (D-7): la misma pantalla sirve para las dos cosas.
// Si el correo no tiene cuenta, Supabase la crea. Mientras no haya un servicio de correo
// propio, el correo trae un enlace (no un código): lleva a /auth/confirmar, que inicia la
// sesión. Tiene que abrirse en el mismo navegador porque el enlace se valida con una cookie.
export default function EnterPage() {
  return (
    <Suspense>
      <EnterForm />
    </Suspense>
  );
}

function EnterForm() {
  const linkFailed = useSearchParams().get("error") === "enlace";
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "sent">("email");
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
      // Supabase limita cuántos correos se mandan por hora (docs/desarrollo.md).
      setError(
        error.status === 429 || error.code === "over_email_send_rate_limit"
          ? "Se han enviado demasiados correos seguidos. Espera un rato e inténtalo de nuevo."
          : "No pudimos enviar el correo. Revisa la dirección e inténtalo de nuevo.",
      );
      return;
    }
    setStep("sent");
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
        <div className="flex flex-col gap-4">
          <p className="text-lg">
            Te hemos enviado un correo a <strong>{email}</strong>.
          </p>
          <p className="text-zinc-600 dark:text-zinc-300">
            Ábrelo y toca el enlace para entrar. Hazlo en este mismo navegador: si se abre en otro, no podrás entrar.
          </p>
          <p className="text-sm text-zinc-500">Si no lo ves en unos minutos, mira en la carpeta de spam.</p>
          <button type="button" onClick={() => setStep("email")} className="text-zinc-500 underline">
            Usar otro correo
          </button>
        </div>
      )}
      {linkFailed && !error && step === "email" && (
        <p className="text-red-600">El enlace no es válido o ha caducado. Pide uno nuevo.</p>
      )}
      {error && <p className="text-red-600">{error}</p>}
    </main>
  );
}
