// Reglas de "Descubrir" (D-10, D-11 y D-12 en docs/decisiones.md). Sin dependencias: lo usan
// las pantallas, el servidor y las pruebas. La base de datos repite las reglas críticas
// (rangos, redondeo de la ubicación, a quién se ve) para que no dependan solo de este código.

import { MIN_AGE } from "./profile";

export const MAX_AGE = 99;
export const DEFAULT_MIN_AGE = MIN_AGE;
export const DEFAULT_MAX_AGE = MAX_AGE;
export const MIN_DISTANCE_KM = 2;
export const MAX_DISTANCE_KM = 200;
export const DEFAULT_DISTANCE_KM = 50;
// Un "paso" esconde el perfil durante estos días (D-11).
export const PASS_HIDES_DAYS = 30;
// La ubicación se guarda redondeada a una cuadrícula de 0,02 grados (unos 2 km) (D-12).
export const LOCATION_STEP_DEGREES = 0.02;

export type Preferences = { minAge: number; maxAge: number; maxDistanceKm: number };
export type PreferenceErrors = Partial<Record<keyof Preferences, string>>;

export function validatePreferences(p: Preferences): PreferenceErrors {
  const errors: PreferenceErrors = {};
  const whole = (n: number) => Number.isInteger(n);
  if (!whole(p.minAge) || p.minAge < MIN_AGE || p.minAge > MAX_AGE) {
    errors.minAge = `La edad mínima tiene que estar entre ${MIN_AGE} y ${MAX_AGE}.`;
  }
  if (!whole(p.maxAge) || p.maxAge < MIN_AGE || p.maxAge > MAX_AGE) {
    errors.maxAge = `La edad máxima tiene que estar entre ${MIN_AGE} y ${MAX_AGE}.`;
  } else if (!errors.minAge && p.maxAge < p.minAge) {
    errors.maxAge = "La edad máxima no puede ser menor que la mínima.";
  }
  if (!whole(p.maxDistanceKm) || p.maxDistanceKm < MIN_DISTANCE_KM || p.maxDistanceKm > MAX_DISTANCE_KM) {
    errors.maxDistanceKm = `La distancia tiene que estar entre ${MIN_DISTANCE_KM} y ${MAX_DISTANCE_KM} km.`;
  }
  return errors;
}

// Redondea una coordenada a la cuadrícula de unos 2 km. Igual que el trigger de la base.
export function roundCoordinate(value: number): number {
  return Number((Math.round(value / LOCATION_STEP_DEGREES) * LOCATION_STEP_DEGREES).toFixed(2));
}

export function isValidLocation(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

// Texto de distancia que ven los demás. Como la ubicación es aproximada, nunca se da menos de 2 km.
export function distanceLabel(km: number): string {
  if (km < MIN_DISTANCE_KM) return `A menos de ${MIN_DISTANCE_KM} km`;
  return `A ${Math.round(km)} km`;
}

// Para buscar ciudades sin importar mayúsculas, tildes ni guiones.
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type City = [name: string, province: string, lat: number, lon: number];

// Devuelve los índices de las ciudades que coinciden, primero las que empiezan por el texto.
// La lista viene ordenada por población, así que las grandes salen antes.
export function searchCities(cities: readonly City[], query: string, limit = 8): number[] {
  const q = normalizeName(query);
  if (q.length < 2) return [];
  const starts: number[] = [];
  const contains: number[] = [];
  cities.forEach(([name], i) => {
    const n = normalizeName(name);
    // Vale el comienzo de cualquier palabra, para nombres como "Gasteiz / Vitoria".
    if (` ${n}`.includes(` ${q}`)) {
      starts.push(i);
    } else if (n.includes(q)) {
      contains.push(i);
    }
  });
  return [...starts, ...contains].slice(0, limit);
}
