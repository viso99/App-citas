"use client";

import { useState } from "react";
import { deleteAccount } from "./actions";

// "Eliminar mi cuenta", con confirmación. Si sale bien, la acción redirige fuera del perfil.
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function confirm() {
    setBusy(true);
    setError(false);
    const result = await deleteAccount();
    if (result && !result.ok) {
      setBusy(false);
      setError(true);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="self-center text-sm text-zinc-500 underline">
        Eliminar mi cuenta
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
        >
          <div className="flex w-full max-w-md flex-col gap-4 rounded-t-3xl bg-white p-6 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
            <h2 id="delete-title" className="text-xl font-bold">
              ¿Eliminar tu cuenta?
            </h2>
            <p className="text-zinc-600 dark:text-zinc-300">
              Se borrarán tu perfil, tus fotos, tus coincidencias y tus conversaciones. No se puede deshacer.
            </p>
            {error && <p className="text-sm text-red-600">No pudimos eliminar la cuenta. Inténtalo de nuevo.</p>}
            <button
              type="button"
              disabled={busy}
              onClick={confirm}
              className="rounded-full bg-red-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Eliminando…" : "Eliminar mi cuenta"}
            </button>
            <button type="button" disabled={busy} onClick={() => setOpen(false)} className="py-2 text-zinc-500">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
