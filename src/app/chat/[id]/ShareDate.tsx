"use client";

import { useState } from "react";
import { dateShareText, PLACE_MAX } from "@/lib/shareDate";

// "Compartir mi cita" (D-38): manda a alguien de confianza con quién, dónde y cuándo vas a
// quedar. No se guarda nada en Zuvi.
export function ShareDate({ name, age }: { name: string; age: number | null }) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState("");
  const [when, setWhen] = useState("");
  const [copied, setCopied] = useState(false);
  const text = dateShareText({ name, age, place, when });

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ text });
        setOpen(false);
      } catch {
        // La persona cerró el menú de compartir: no pasa nada.
      }
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Compartir mi cita con alguien de confianza"
        className="ml-auto rounded-full px-2 text-xl"
      >
        🛡️
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-date-title"
            onClick={(e) => e.stopPropagation()}
            className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-t-3xl bg-white p-6 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <h2 id="share-date-title" className="text-xl font-bold">
              Compartir mi cita
            </h2>
            <p className="text-sm text-zinc-500">
              Cuéntale a alguien de confianza con quién y dónde vas a quedar. Zuvi no guarda nada de esto.
            </p>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-zinc-500">Dónde</span>
              <input
                value={place}
                maxLength={PLACE_MAX}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Ej.: Café Central, calle Mayor 3"
                className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-zinc-500">Cuándo</span>
              <input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900"
              />
            </label>
            <p className="whitespace-pre-wrap rounded-2xl bg-zinc-100 p-3 text-sm dark:bg-zinc-800">{text}</p>
            <button type="button" onClick={share} className="rounded-full bg-rose-600 px-5 py-3 font-semibold text-white">
              Compartir
            </button>
            <button type="button" onClick={copy} className="rounded-full border border-zinc-300 px-5 py-3 font-semibold dark:border-zinc-700">
              {copied ? "¡Copiado!" : "Copiar el texto"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="py-2 text-zinc-500">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
