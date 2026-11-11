// Datos opcionales del perfil, preguntas y filtros (D-23 en docs/decisiones.md). Sin
// dependencias: lo usan las pantallas, el servidor y las pruebas. La base repite las reglas
// (opciones válidas, largos y máximos) en la migración de perfil.
// Las listas y los textos son una propuesta de Claude, a revisar por Sergio. A propósito no hay
// religión, política, salud ni "qué busco" (podría revelar vida sexual): categoría especial del RGPD.

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

export type Extras = {
  heightCm: number | null;
  job: string;
  studies: string | null;
  smoking: string | null;
  drinking: string | null;
  children: string | null;
};

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
  ].filter((x): x is string => Boolean(x));
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
export type Filters = { onlyNonSmokers: boolean; onlyWantsChildren: boolean; onlyVerified: boolean };

// Gestos para la foto de verificación (D-23): la persona se hace un selfie imitándolo.
export const GESTURES = {
  pulgar: "con el pulgar hacia arriba",
  paz: "haciendo el signo de la paz con dos dedos",
  mano_cara: "con la mano abierta junto a la cara",
  tres_dedos: "enseñando tres dedos",
  saludo: "saludando con la mano",
} as const;
