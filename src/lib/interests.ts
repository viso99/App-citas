// Aficiones del perfil (D-18 en docs/decisiones.md). Sin dependencias: lo usan las pantallas,
// el servidor y las pruebas. Se eligen de esta lista, hasta 5 y son opcionales.
// La lista es una propuesta, a revisar por Sergio. A propósito no incluye religión, política
// ni salud: son datos de categoría especial del RGPD (docs/privacidad-y-legal.md).
// La base guarda solo las claves y comprueba el formato y el máximo (migración de extras).

export const MAX_INTERESTS = 5;

export const INTEREST_GROUPS = [
  {
    name: "Deporte",
    items: {
      correr: "Correr",
      gimnasio: "Gimnasio",
      futbol: "Fútbol",
      baloncesto: "Baloncesto",
      padel: "Pádel",
      tenis: "Tenis",
      natacion: "Natación",
      ciclismo: "Ciclismo",
      senderismo: "Senderismo",
      escalada: "Escalada",
      yoga: "Yoga",
      surf: "Surf",
      esqui: "Esquí",
      artes_marciales: "Artes marciales",
    },
  },
  {
    name: "Música y baile",
    items: {
      conciertos: "Conciertos",
      festivales: "Festivales",
      tocar_musica: "Tocar un instrumento",
      cantar: "Cantar",
      karaoke: "Karaoke",
      bailar: "Bailar",
      flamenco: "Flamenco",
      salsa_bachata: "Salsa y bachata",
    },
  },
  {
    name: "Cultura",
    items: {
      cine: "Cine",
      series: "Series",
      teatro: "Teatro",
      leer: "Leer",
      museos: "Museos",
      fotografia: "Fotografía",
      pintar_dibujar: "Pintar y dibujar",
      escribir: "Escribir",
      historia: "Historia",
      idiomas: "Idiomas",
      podcasts: "Pódcasts",
      anime_manga: "Anime y manga",
    },
  },
  {
    name: "Comida y bebida",
    items: {
      cocinar: "Cocinar",
      reposteria: "Repostería",
      tapas: "Ir de tapas",
      restaurantes: "Probar restaurantes",
      vino: "Vino",
      cerveza_artesana: "Cerveza artesana",
      cafe: "Café",
      vegetariano: "Comida vegetariana",
    },
  },
  {
    name: "Viajes y naturaleza",
    items: {
      viajar: "Viajar",
      playa: "Playa",
      montana: "Montaña",
      camping: "Acampada",
      escapadas: "Escapadas de fin de semana",
      mochilero: "Viajar de mochilero",
      animales: "Animales",
      perros: "Perros",
      gatos: "Gatos",
      jardineria: "Plantas y jardinería",
    },
  },
  {
    name: "Ocio",
    items: {
      videojuegos: "Videojuegos",
      juegos_mesa: "Juegos de mesa",
      salir_noche: "Salir de noche",
      planes_tranquilos: "Planes tranquilos en casa",
      moda: "Moda",
      manualidades: "Manualidades",
      tecnologia: "Tecnología",
      coches_motos: "Coches y motos",
      voluntariado: "Voluntariado",
      meditacion: "Meditación",
    },
  },
] as const satisfies readonly { name: string; items: Record<string, string> }[];

export const INTERESTS: Record<string, string> = Object.assign({}, ...INTEREST_GROUPS.map((g) => g.items));

export function isInterest(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(INTERESTS, key);
}

export function validateInterests(keys: readonly string[]): string | null {
  if (new Set(keys).size !== keys.length) return "Hay aficiones repetidas.";
  if (keys.some((k) => !isInterest(k))) return "Alguna afición no es válida.";
  if (keys.length > MAX_INTERESTS) return `Elige como máximo ${MAX_INTERESTS} aficiones.`;
  return null;
}

// Las aficiones de un perfil en el orden de la lista, marcando las que comparte con quien mira.
// Las claves que ya no estén en la lista se ignoran.
export function interestChips(theirs: readonly string[], mine: readonly string[]) {
  const shared = new Set(mine);
  return theirs
    .filter(isInterest)
    .map((key) => ({ key, label: INTERESTS[key], shared: shared.has(key) }))
    .sort((a, b) => Number(b.shared) - Number(a.shared));
}
