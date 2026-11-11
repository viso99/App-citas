"use client";

import { useState } from "react";
import { TRAVEL_CITIES, TRAVEL_DAYS, type TravelCity } from "@/lib/travel";
import { setTravel } from "./actions";

const cities = (Object.entries(TRAVEL_CITIES) as [TravelCity, { name: string }][]).sort((a, b) =>
  a[1].name.localeCompare(b[1].name, "es"),
);

// Modo viaje (D-39): ver gente de otra ciudad antes de ir. Mientras está activo, la gente de
// allí también te ve a ti, marcado "De viaje por aquí", y la de tu zona deja de verte.
export function TravelMode({ initialCity }: { initialCity: TravelCity | null }) {
  const [city, setCity] = useState<TravelCity | null>(initialCity);
  const [choice, setChoice] = useState<TravelCity | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function save(next: TravelCity | null) {
    setBusy(true);
    setError(false);
    const { ok } = await setTravel(next);
    setBusy(false);
    if (ok) {
      setCity(next);
      setChoice("");
    } else setError(true);
  }

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <span className="font-medium">
        <span aria-hidden>✈️ </span>
        {city ? `Estás de viaje en ${TRAVEL_CITIES[city].name}` : "Modo viaje"}
      </span>
      <span className="text-sm text-zinc-500">
        {city
          ? "En Descubrir ves a gente de allí y ellos te ven a ti como «De viaje por aquí». La gente de tu zona no te ve mientras tanto."
          : `¿Vas a ir a otra ciudad? Conoce gente de allí antes de llegar. Se quita solo a los ${TRAVEL_DAYS} días.`}
      </span>
      {city ? (
        <button
          type="button"
          onClick={() => save(null)}
          disabled={busy}
          className="w-fit rounded-full bg-rose-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Un momento…" : "Volver a mi zona"}
        </button>
      ) : (
        <div className="flex gap-2">
          <select
            value={choice}
            onChange={(e) => setChoice(e.target.value as TravelCity | "")}
            aria-label="Ciudad del viaje"
            className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          >
            <option value="">Elige una ciudad…</option>
            {cities.map(([key, c]) => (
              <option key={key} value={key}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => choice && save(choice)}
            disabled={busy || !choice}
            className="rounded-full border border-zinc-300 px-5 py-2 font-semibold disabled:opacity-50 dark:border-zinc-700"
          >
            {busy ? "…" : "Activar"}
          </button>
        </div>
      )}
      {error && <span className="text-sm text-red-600">No pudimos guardar el cambio. Inténtalo de nuevo.</span>}
    </section>
  );
}
