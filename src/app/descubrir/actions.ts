"use server";

import { redirect } from "next/navigation";
import cities from "@/data/ciudades-es.json";
import { isValidLocation, searchCities, type City } from "@/lib/discover";
import { sendPush } from "@/lib/supabase/sendPush";
import { getUser } from "@/lib/supabase/server";
import { loadCards, type Card } from "./cards";

const CITY_LIST = cities as City[];

export type CityOption = { index: number; label: string };

export async function findCities(query: string): Promise<CityOption[]> {
  return searchCities(CITY_LIST, String(query)).map((index) => ({
    index,
    label: `${CITY_LIST[index][0]} (${CITY_LIST[index][1]})`,
  }));
}

// Guarda la ubicación del móvil. La base la redondea a unos 2 km antes de guardarla (D-12).
export async function saveDeviceLocation(lat: number, lon: number): Promise<{ ok: boolean }> {
  if (!isValidLocation(lat, lon)) return { ok: false };
  return saveLocation(lat, lon);
}

// Guarda la ubicación de una ciudad de la lista, para quien no da permiso de ubicación.
export async function saveCityLocation(index: number): Promise<{ ok: boolean }> {
  const city = Number.isInteger(index) ? CITY_LIST[index] : undefined;
  if (!city) return { ok: false };
  return saveLocation(city[2], city[3]);
}

async function saveLocation(lat: number, lon: number) {
  const { supabase, user } = await getUser();
  if (!user) redirect("/entrar");
  const { data, error } = await supabase.from("profiles").update({ lat, lon }).eq("id", user.id).select("id");
  return { ok: !error && (data?.length ?? 0) === 1 };
}

// Devuelve `match: true` si el "me gusta" era mutuo y se creó una coincidencia.
export async function swipe(
  targetId: string,
  choice: "me_gusta" | "paso",
): Promise<{ ok: boolean; match: boolean }> {
  if (choice !== "me_gusta" && choice !== "paso") return { ok: false, match: false };
  const { supabase, user } = await getUser();
  if (!user) redirect("/entrar");
  const { data, error } = await supabase.rpc("swipe", { target: targetId, choice });
  const match = !error && data === true;
  if (match) await sendPush(supabase, targetId, "match");
  return { ok: !error, match };
}

// El superlike del día (D-17). `ok: false` con `limit: true` si ya se usó hoy.
export async function superlike(targetId: string): Promise<{ ok: boolean; match: boolean; limit: boolean }> {
  const { supabase, user } = await getUser();
  if (!user) redirect("/entrar");
  const { data, error } = await supabase.rpc("superlike", { target: targetId });
  if (error) return { ok: false, match: false, limit: error.code === "23514" };
  if (data === true) await sendPush(supabase, targetId, "match");
  return { ok: true, match: data === true, limit: false };
}

// Deshace un "paso" (D-21): el perfil vuelve a la cola.
export async function undoPass(targetId: string): Promise<{ ok: boolean }> {
  const { supabase, user } = await getUser();
  if (!user) redirect("/entrar");
  const { data, error } = await supabase.rpc("undo_pass", { target: targetId });
  return { ok: !error && data === true };
}

export async function nextCards(): Promise<Card[]> {
  const { supabase, user } = await getUser();
  if (!user) redirect("/entrar");
  return loadCards(supabase);
}
