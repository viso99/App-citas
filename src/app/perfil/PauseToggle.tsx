"use client";

import { useState } from "react";
import { setPaused } from "./actions";

// Pausar el perfil (D-27): deja de salir en Descubrir sin borrar nada. Las coincidencias y los
// chats siguen igual.
export function PauseToggle({ initialPaused }: { initialPaused: boolean }) {
  const [paused, setPausedState] = useState(initialPaused);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function toggle() {
    setBusy(true);
    setError(false);
    const { ok } = await setPaused(!paused);
    setBusy(false);
    if (ok) setPausedState(!paused);
    else setError(true);
  }

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <span className="font-medium">{paused ? "Tu perfil está en pausa" : "Pausar mi perfil"}</span>
      <span className="text-sm text-zinc-500">
        {paused
          ? "Nadie nuevo te ve en Descubrir. Tus coincidencias y tus chats siguen igual."
          : "Deja de salir en Descubrir un tiempo, sin borrar nada. Tus coincidencias y tus chats siguen."}
      </span>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`w-fit rounded-full px-5 py-2 font-semibold disabled:opacity-50 ${
          paused ? "bg-rose-600 text-white" : "border border-zinc-300 dark:border-zinc-700"
        }`}
      >
        {busy ? "Un momento…" : paused ? "Volver a aparecer" : "Pausar"}
      </button>
      {error && <span className="text-sm text-red-600">No pudimos guardar el cambio. Inténtalo de nuevo.</span>}
    </section>
  );
}
