// Modo viaje (D-39): ver gente de otra ciudad antes de ir. Lista fija de ciudades de España con
// las coordenadas de su centro, para no mandar lo que escribe la persona a ningún servicio de
// mapas. La base guarda la clave y las coordenadas, y Descubrir usa estas en lugar de las tuyas.

export const TRAVEL_CITIES = {
  a_coruna: { name: "A Coruña", lat: 43.37, lon: -8.4 },
  alicante: { name: "Alicante", lat: 38.35, lon: -0.48 },
  almeria: { name: "Almería", lat: 36.84, lon: -2.46 },
  badajoz: { name: "Badajoz", lat: 38.88, lon: -6.97 },
  barcelona: { name: "Barcelona", lat: 41.39, lon: 2.17 },
  bilbao: { name: "Bilbao", lat: 43.26, lon: -2.93 },
  burgos: { name: "Burgos", lat: 42.34, lon: -3.7 },
  cadiz: { name: "Cádiz", lat: 36.53, lon: -6.29 },
  castellon: { name: "Castellón de la Plana", lat: 39.99, lon: -0.05 },
  cordoba: { name: "Córdoba", lat: 37.89, lon: -4.78 },
  girona: { name: "Girona", lat: 41.98, lon: 2.82 },
  granada: { name: "Granada", lat: 37.18, lon: -3.6 },
  huelva: { name: "Huelva", lat: 37.26, lon: -6.95 },
  ibiza: { name: "Ibiza", lat: 38.91, lon: 1.43 },
  jaen: { name: "Jaén", lat: 37.78, lon: -3.79 },
  las_palmas: { name: "Las Palmas de Gran Canaria", lat: 28.12, lon: -15.43 },
  leon: { name: "León", lat: 42.6, lon: -5.57 },
  lleida: { name: "Lleida", lat: 41.62, lon: 0.62 },
  logrono: { name: "Logroño", lat: 42.47, lon: -2.45 },
  madrid: { name: "Madrid", lat: 40.42, lon: -3.7 },
  malaga: { name: "Málaga", lat: 36.72, lon: -4.42 },
  marbella: { name: "Marbella", lat: 36.51, lon: -4.88 },
  murcia: { name: "Murcia", lat: 37.99, lon: -1.13 },
  oviedo: { name: "Oviedo", lat: 43.36, lon: -5.85 },
  palma: { name: "Palma", lat: 39.57, lon: 2.65 },
  pamplona: { name: "Pamplona", lat: 42.81, lon: -1.64 },
  salamanca: { name: "Salamanca", lat: 40.97, lon: -5.66 },
  san_sebastian: { name: "San Sebastián", lat: 43.32, lon: -1.98 },
  santa_cruz: { name: "Santa Cruz de Tenerife", lat: 28.47, lon: -16.25 },
  santander: { name: "Santander", lat: 43.46, lon: -3.81 },
  santiago: { name: "Santiago de Compostela", lat: 42.88, lon: -8.54 },
  sevilla: { name: "Sevilla", lat: 37.39, lon: -5.99 },
  tarragona: { name: "Tarragona", lat: 41.12, lon: 1.25 },
  toledo: { name: "Toledo", lat: 39.86, lon: -4.03 },
  valencia: { name: "Valencia", lat: 39.47, lon: -0.38 },
  valladolid: { name: "Valladolid", lat: 41.65, lon: -4.72 },
  vigo: { name: "Vigo", lat: 42.24, lon: -8.72 },
  vitoria: { name: "Vitoria-Gasteiz", lat: 42.85, lon: -2.67 },
  zaragoza: { name: "Zaragoza", lat: 41.65, lon: -0.88 },
} as const;

export type TravelCity = keyof typeof TRAVEL_CITIES;

export function isTravelCity(key: unknown): key is TravelCity {
  return typeof key === "string" && Object.prototype.hasOwnProperty.call(TRAVEL_CITIES, key);
}

export function travelCityName(key: string | null): string | null {
  return isTravelCity(key) ? TRAVEL_CITIES[key].name : null;
}

// El modo viaje se apaga solo a los 30 días, por si se olvida. Igual que en la base.
export const TRAVEL_DAYS = 30;

// La ciudad del viaje si sigue activo, o null.
export function activeTravelCity(city: string | null, startedAt: string | null, now: Date = new Date()): TravelCity | null {
  if (!isTravelCity(city) || !startedAt) return null;
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return null;
  return now.getTime() - started < TRAVEL_DAYS * 24 * 60 * 60 * 1000 ? city : null;
}
