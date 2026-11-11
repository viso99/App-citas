// Datos opcionales del perfil, preguntas y filtros (D-23 en docs/decisiones.md). Sin
// dependencias: lo usan las pantallas, el servidor y las pruebas. La base repite las reglas
// (opciones válidas, largos y máximos) en la migración de perfil.
// Las listas y los textos son una propuesta de Claude, a revisar por Sergio. A propósito no hay
// religión, política ni salud: categoría especial del RGPD. "Qué buscas" (D-36) es opcional y no
// tiene ninguna opción sobre sexo, para no revelar vida sexual.

export const HEIGHT_MIN = 120;
export const HEIGHT_MAX = 230;
export const JOB_MAX = 60;

export const STUDIES = {
  secundaria: "Secundaria",
  bachillerato: "Bachillerato",
  fp: "Formación profesional",
  universidad: "Universidad",
  posgrado: "Máster o doctorado",
} as const;

export const SMOKING = { no: "No fumo", a_veces: "Fumo a veces", si: "Fumo" } as const;
export const DRINKING = { no: "No bebo", socialmente: "Bebo en ocasiones", si: "Bebo a menudo" } as const;
export const CHILDREN = {
  no_quiero: "No quiero hijos",
  quiero: "Quiero hijos",
  tengo: "Tengo hijos",
  no_lo_se: "Aún no lo sé",
} as const;

// Qué buscas (D-36).
export const LOOKING_FOR = {
  estable: "Una relación estable",
  sin_prisa: "Conocer a alguien sin prisa",
  amistad: "Hacer amistades",
  no_lo_se: "Aún no lo tengo claro",
} as const;

// Idiomas, mascotas y signo (D-41).
export const MAX_LANGUAGES = 5;
export const LANGUAGES = {
  es: "Español",
  ca: "Catalán",
  eu: "Euskera",
  gl: "Gallego",
  en: "Inglés",
  fr: "Francés",
  de: "Alemán",
  it: "Italiano",
  pt: "Portugués",
  ar: "Árabe",
  ro: "Rumano",
  zh: "Chino",
  ru: "Ruso",
  uk: "Ucraniano",
  nl: "Neerlandés",
  lse: "Lengua de signos",
} as const;

export const PETS = {
  perro: "Tengo perro",
  gato: "Tengo gato",
  otras: "Tengo otras mascotas",
  ninguna: "Sin mascotas",
  quiero: "Me gustaría tener",
  alergia: "Tengo alergia a los animales",
} as const;

export const ZODIAC = {
  aries: "Aries",
  tauro: "Tauro",
  geminis: "Géminis",
  cancer: "Cáncer",
  leo: "Leo",
  virgo: "Virgo",
  libra: "Libra",
  escorpio: "Escorpio",
  sagitario: "Sagitario",
  capricornio: "Capricornio",
  acuario: "Acuario",
  piscis: "Piscis",
} as const;

export type Extras = {
  heightCm: number | null;
  job: string;
  studies: string | null;
  smoking: string | null;
  drinking: string | null;
  children: string | null;
  lookingFor: string | null;
  languages: string[];
  pets: string | null;
  zodiac: string | null;
};

export const EMPTY_EXTRAS: Extras = {
  heightCm: null,
  job: "",
  studies: null,
  smoking: null,
  drinking: null,
  children: null,
  lookingFor: null,
  languages: [],
  pets: null,
  zodiac: null,
};

// Las columnas de la base (tabla profiles o discover_profiles) como Extras.
export type ExtrasRow = {
  height_cm?: number | null;
  job?: string | null;
  studies?: string | null;
  smoking?: string | null;
  drinking?: string | null;
  children?: string | null;
  looking_for?: string | null;
  languages?: string[] | null;
  pets?: string | null;
  zodiac?: string | null;
};

export function extrasFromRow(r: ExtrasRow | null | undefined): Extras {
  return {
    heightCm: r?.height_cm ?? null,
    job: r?.job ?? "",
    studies: r?.studies ?? null,
    smoking: r?.smoking ?? null,
    drinking: r?.drinking ?? null,
    children: r?.children ?? null,
    lookingFor: r?.looking_for ?? null,
    languages: r?.languages ?? [],
    pets: r?.pets ?? null,
    zodiac: r?.zodiac ?? null,
  };
}

export type ExtrasErrors = Partial<Record<keyof Extras, string>>;

const isOption = (options: object, value: string | null) =>
  value === null || Object.prototype.hasOwnProperty.call(options, value);

export function validateExtras(e: Extras): ExtrasErrors {
  const errors: ExtrasErrors = {};
  if (e.heightCm !== null && (!Number.isInteger(e.heightCm) || e.heightCm < HEIGHT_MIN || e.heightCm > HEIGHT_MAX)) {
    errors.heightCm = `La altura tiene que estar entre ${HEIGHT_MIN} y ${HEIGHT_MAX} cm.`;
  }
  if (e.job.trim().length > JOB_MAX) errors.job = `Máximo ${JOB_MAX} caracteres.`;
  if (!isOption(STUDIES, e.studies)) errors.studies = "Elige una opción.";
  if (!isOption(SMOKING, e.smoking)) errors.smoking = "Elige una opción.";
  if (!isOption(DRINKING, e.drinking)) errors.drinking = "Elige una opción.";
  if (!isOption(CHILDREN, e.children)) errors.children = "Elige una opción.";
  if (!isOption(LOOKING_FOR, e.lookingFor)) errors.lookingFor = "Elige una opción.";
  if (!isOption(PETS, e.pets)) errors.pets = "Elige una opción.";
  if (!isOption(ZODIAC, e.zodiac)) errors.zodiac = "Elige una opción.";
  if (e.languages.length > MAX_LANGUAGES) errors.languages = `Elige como máximo ${MAX_LANGUAGES} idiomas.`;
  else if (new Set(e.languages).size !== e.languages.length || e.languages.some((l) => !isOption(LANGUAGES, l))) {
    errors.languages = "Algún idioma no es válido.";
  }
  return errors;
}

// Lo que se enseña en la tarjeta, en este orden, sin lo que no se indicó.
export function extrasLabels(e: Extras): string[] {
  const label = (options: Record<string, string>, value: string | null) => (value ? options[value] : undefined);
  return [
    e.heightCm ? `${e.heightCm} cm` : undefined,
    e.job.trim() || undefined,
    label(STUDIES, e.studies),
    label(SMOKING, e.smoking),
    label(DRINKING, e.drinking),
    label(CHILDREN, e.children),
    label(PETS, e.pets),
    e.zodiac && label(ZODIAC, e.zodiac) ? `Signo: ${label(ZODIAC, e.zodiac)}` : undefined,
    languagesLabel(e.languages),
  ].filter((x): x is string => Boolean(x));
}

// "Habla español", "Habla español e inglés", "Habla catalán, español y francés".
export function languagesLabel(keys: readonly string[]): string | undefined {
  const names = keys
    .filter((k) => Object.prototype.hasOwnProperty.call(LANGUAGES, k))
    .map((k) => {
      const name: string = LANGUAGES[k as keyof typeof LANGUAGES];
      return k === "lse" ? "lengua de signos" : name.toLowerCase();
    });
  if (names.length === 0) return undefined;
  if (names.length === 1) return `Habla ${names[0]}`;
  const last = names[names.length - 1];
  // "y" pasa a "e" delante de una palabra que empieza por "i" (español e inglés).
  const and = /^h?i(?![aeou])/.test(last) ? "e" : "y";
  return `Habla ${names.slice(0, -1).join(", ")} ${and} ${last}`;
}

// Texto de "Qué buscas" para la tarjeta, o null.
export function lookingForLabel(key: string | null): string | null {
  return key && Object.prototype.hasOwnProperty.call(LOOKING_FOR, key) ? LOOKING_FOR[key as keyof typeof LOOKING_FOR] : null;
}

// Preguntas para el perfil (D-23): se eligen hasta 3 y se responden en una frase corta.
export const MAX_PROMPTS = 3;
export const PROMPT_ANSWER_MAX = 150;

export const PROMPTS = {
  domingo: "Mi plan ideal de domingo es…",
  cita: "La primera cita perfecta sería…",
  viaje: "El mejor viaje que he hecho…",
  comida: "No puedo vivir sin comer…",
  cancion: "Una canción que nunca me canso de escuchar…",
  serie: "La última serie que me enganchó…",
  mania: "Una manía mía…",
  orgullo: "Algo de lo que estoy orgulloso u orgullosa…",
  aprender: "Algo que quiero aprender este año…",
  pequeno: "Me hacen feliz las pequeñas cosas como…",
  verdad: "Dos verdades y una mentira…",
  conquistar: "Me conquistas si…",
  ciudad: "Mi rincón favorito de mi ciudad…",
  superpoder: "Si tuviera un superpoder sería…",
  debate: "Un debate en el que no cedo…",
} as const;

export type PromptAnswer = { key: string; answer: string };

export function validatePrompts(list: readonly PromptAnswer[]): string | null {
  if (list.length > MAX_PROMPTS) return `Elige como máximo ${MAX_PROMPTS} preguntas.`;
  const keys = list.map((p) => p.key);
  if (new Set(keys).size !== keys.length) return "Hay preguntas repetidas.";
  for (const p of list) {
    if (!Object.prototype.hasOwnProperty.call(PROMPTS, p.key)) return "Alguna pregunta no es válida.";
    const answer = p.answer.trim();
    if (!answer) return "Responde las preguntas que elegiste o quítalas.";
    if (answer.length > PROMPT_ANSWER_MAX) return `Cada respuesta puede tener como máximo ${PROMPT_ANSWER_MAX} caracteres.`;
  }
  return null;
}

// Filtros de Descubrir (D-23): opcionales; si están activos solo se ve a quien cumple.
// "Solo quien busca lo mismo que yo" (D-36) solo tiene efecto si indicaste qué buscas.
export type Filters = { onlyNonSmokers: boolean; onlyWantsChildren: boolean; onlyVerified: boolean; onlySameGoal: boolean };

// Gestos para la foto de verificación (D-23): la persona se hace un selfie imitándolo.
export const GESTURES = {
  pulgar: "con el pulgar hacia arriba",
  paz: "haciendo el signo de la paz con dos dedos",
  mano_cara: "con la mano abierta junto a la cara",
  tres_dedos: "enseñando tres dedos",
  saludo: "saludando con la mano",
} as const;
