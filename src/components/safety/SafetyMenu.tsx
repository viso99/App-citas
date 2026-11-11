"use client";

import { useState } from "react";
import { REPORT_DETAILS_MAX, REPORT_REASONS, type ReportReason } from "@/lib/safety";
import { blockUser, reportUser, unmatchUser } from "./actions";

type Step = "closed" | "menu" | "block" | "report" | "unmatch" | "done";
type Outcome = "block" | "report" | "unmatch";

// Menú "⋯" para bloquear o denunciar a una persona. `onDone` se llama al cerrar el aviso final.
export function SafetyMenu({
  targetId,
  name,
  onDone,
  className = "",
  canUnmatch = false,
}: {
  targetId: string;
  name: string;
  onDone: () => void;
  className?: string;
  // En el chat se puede además deshacer la coincidencia (D-21).
  canUnmatch?: boolean;
}) {
  const [step, setStep] = useState<Step>("closed");
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>("block");

  function close() {
    setStep("closed");
    setReason(null);
    setDetails("");
    setError(null);
  }

  async function run(action: () => Promise<{ ok: boolean }>, what: Outcome) {
    setBusy(true);
    setError(null);
    const { ok } = await action();
    setBusy(false);
    if (!ok) {
      setError("No pudimos completarlo. Comprueba la conexión e inténtalo de nuevo.");
      return;
    }
    setOutcome(what);
    setStep("done");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setStep("menu")}
        aria-label={`Opciones de ${name}`}
        className={`flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none ${className}`}
      >
        ⋯
      </button>
      {step !== "closed" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Opciones de ${name}`}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={(e) => e.target === e.currentTarget && step !== "done" && !busy && close()}
        >
          <div className="flex max-h-[90dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-3xl bg-white p-6 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
            {step === "menu" && (
              <>
                {canUnmatch && (
                  <button
                    type="button"
                    onClick={() => setStep("unmatch")}
                    className="rounded-full border border-zinc-300 px-6 py-3 font-semibold dark:border-zinc-700"
                  >
                    Deshacer la coincidencia
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setStep("block")}
                  className="rounded-full border border-zinc-300 px-6 py-3 font-semibold dark:border-zinc-700"
                >
                  Bloquear a {name}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("report")}
                  className="rounded-full border border-red-300 px-6 py-3 font-semibold text-red-600"
                >
                  Denunciar a {name}
                </button>
                <button type="button" onClick={close} className="py-2 text-zinc-500">
                  Cancelar
                </button>
              </>
            )}

            {step === "unmatch" && (
              <>
                <h2 className="text-xl font-bold">¿Deshacer la coincidencia con {name}?</h2>
                <p className="text-zinc-600 dark:text-zinc-300">
                  Se borrará vuestra conversación y no podréis volver a escribiros. {name} no recibirá ningún aviso.
                </p>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => unmatchUser(targetId), "unmatch")}
                  className="rounded-full bg-rose-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Deshaciendo…" : "Deshacer la coincidencia"}
                </button>
                <button type="button" disabled={busy} onClick={close} className="py-2 text-zinc-500">
                  Cancelar
                </button>
              </>
            )}

            {step === "block" && (
              <>
                <h2 className="text-xl font-bold">¿Bloquear a {name}?</h2>
                <p className="text-zinc-600 dark:text-zinc-300">
                  No os volveréis a ver y se borrará vuestra conversación. {name} no recibirá ningún aviso.
                </p>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => blockUser(targetId), "block")}
                  className="rounded-full bg-rose-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Bloqueando…" : "Bloquear"}
                </button>
                <button type="button" disabled={busy} onClick={close} className="py-2 text-zinc-500">
                  Cancelar
                </button>
              </>
            )}

            {step === "report" && (
              <form
                className="flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (reason) run(() => reportUser(targetId, reason, details), "report");
                }}
              >
                <h2 className="text-xl font-bold">Denunciar a {name}</h2>
                <p className="text-zinc-600 dark:text-zinc-300">
                  Revisaremos la denuncia. Además, se bloqueará a {name} y no os volveréis a ver.
                </p>
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 font-semibold">¿Qué ocurre?</legend>
                  {REPORT_REASONS.map((r) => (
                    <label key={r.value} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="h-4 w-4 accent-rose-600"
                      />
                      {r.label}
                    </label>
                  ))}
                </fieldset>
                <label className="flex flex-col gap-1">
                  <span className="font-semibold">Cuéntanos más (opcional)</span>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    maxLength={REPORT_DETAILS_MAX}
                    rows={3}
                    className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-rose-500 focus:outline-none"
                  />
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={busy || !reason}
                  className="rounded-full bg-red-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Enviando…" : "Enviar denuncia"}
                </button>
                <button type="button" disabled={busy} onClick={close} className="py-2 text-zinc-500">
                  Cancelar
                </button>
              </form>
            )}

            {step === "done" && (
              <>
                <h2 className="text-xl font-bold">
                  {outcome === "report"
                    ? "Gracias por avisarnos"
                    : outcome === "unmatch"
                      ? "Coincidencia deshecha"
                      : "Bloqueado"}
                </h2>
                <p className="text-zinc-600 dark:text-zinc-300">
                  {outcome === "report"
                    ? `Revisaremos la denuncia. Ya no verás a ${name} y ${name} tampoco te verá a ti.`
                    : outcome === "unmatch"
                      ? `Ya no tienes una coincidencia con ${name}.`
                      : `Ya no verás a ${name} y ${name} tampoco te verá a ti.`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onDone();
                  }}
                  className="rounded-full bg-rose-600 px-6 py-3 font-semibold text-white"
                >
                  Entendido
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
