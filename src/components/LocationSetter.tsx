"use client";

import { useState } from "react";
import { findCities, saveCityLocation, saveDeviceLocation, type CityOption } from "@/app/descubrir/actions";

// Pide la ubicación del móvil; si no hay permiso, deja elegir la ciudad (D-12).
// La base guarda la ubicación redondeada a unos 2 km y a los demás solo se les muestra la distancia.
export function LocationSetter({ onSaved, compact = false }: { onSaved: () => void; compact?: boolean }) {
  const [mode, setMode] = useState<"device" | "city">("device");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CityOption[]>([]);

  function useDevice() {
    if (!("geolocation" in navigator)) {
      setMode("city");
      return setMessage("Tu navegador no permite compartir la ubicación. Escribe tu ciudad.");
    }
    setBusy(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { ok } = await saveDeviceLocation(position.coords.latitude, position.coords.longitude);
        setBusy(false);
        if (ok) onSaved();
        else setMessage("No pudimos guardar tu ubicación. Inténtalo de nuevo.");
      },
      () => {
        setBusy(false);
        setMode("city");
        setMessage("No hemos podido obtener tu ubicación. Escribe tu ciudad.");
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    );
  }

  async function search(value: string) {
    setQuery(value);
    setOptions(value.trim().length >= 2 ? await findCities(value) : []);
  }

  async function pickCity(option: CityOption) {
    setBusy(true);
    setMessage(null);
    const { ok } = await saveCityLocation(option.index);
    setBusy(false);
    if (ok) {
      setQuery(option.label);
      setOptions([]);
      onSaved();
    } else setMessage("No pudimos guardar tu ciudad. Inténtalo de nuevo.");
  }

  return (
    <div className="flex flex-col gap-3">
      {!compact && (
        <p className="text-zinc-600 dark:text-zinc-300">
          Para enseñarte gente cerca necesitamos saber dónde estás, de forma aproximada. Guardamos tu zona con un
          margen de unos 2 km y a los demás solo les mostramos a cuántos kilómetros estás.
        </p>
      )}
      {mode === "device" ? (
        <>
          <button
            type="button"
            onClick={useDevice}
            disabled={busy}
            className="w-full rounded-full bg-rose-600 px-6 py-3 text-lg font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {busy ? "Buscando…" : compact ? "Actualizar mi ubicación" : "Usar mi ubicación"}
          </button>
          <button type="button" onClick={() => setMode("city")} className="text-zinc-500 underline">
            Prefiero escribir mi ciudad
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-2">
            <span className="font-medium">Tu ciudad o pueblo</span>
            <input
              value={query}
              onChange={(e) => search(e.target.value)}
              autoComplete="off"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-lg text-zinc-900 focus:border-rose-500 focus:outline-none"
            />
          </label>
          {options.length > 0 && (
            <ul className="overflow-hidden rounded-xl border border-zinc-200">
              {options.map((option) => (
                <li key={option.index}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => pickCity(option)}
                    className="w-full px-4 py-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => setMode("device")} className="text-zinc-500 underline">
            Usar la ubicación del móvil
          </button>
          <p className="text-xs text-zinc-400">Lista de municipios: GeoNames (CC BY 4.0).</p>
        </div>
      )}
      {message && <p className="text-red-600">{message}</p>}
    </div>
  );
}
