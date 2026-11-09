// Reglas del perfil (D-8 en docs/decisiones.md). Sin dependencias: lo usan las pantallas,
// el servidor y las pruebas. La base de datos repite las reglas críticas (edad, largos,
// máximo de fotos) para que no dependan solo de este código.

export const MIN_AGE = 18;
export const FIRST_NAME_MAX = 40;
export const BIO_MAX = 500;
export const MIN_PHOTOS = 2;
export const MAX_PHOTOS = 6;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

// [Supuesto] S-3: las opciones de género son estas tres (docs/pendientes.md).
export const GENDERS = {
  mujer: "Mujer",
  hombre: "Hombre",
  no_binario: "No binario",
} as const;
export type Gender = keyof typeof GENDERS;

export const INTERESTED_IN = {
  hombres: "Hombres",
  mujeres: "Mujeres",
  todos: "Todos",
} as const;
export type InterestedIn = keyof typeof INTERESTED_IN;

export type ProfileInput = {
  firstName: string;
  birthDate: string; // AAAA-MM-DD
  bio: string;
  gender: string;
  interestedIn: string;
  sensitiveConsent: boolean;
};

export type ProfileErrors = Partial<Record<keyof ProfileInput, string>>;

// Fecha AAAA-MM-DD válida (rechaza, por ejemplo, 2001-02-30).
export function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

// Edad en años cumplidos en la fecha `today` (se compara solo el día, en UTC).
export function ageOn(birthDate: Date, today: Date): number {
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayPassed =
    today.getUTCMonth() > birthDate.getUTCMonth() ||
    (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() >= birthDate.getUTCDate());
  if (!birthdayPassed) age -= 1;
  return age;
}

export function validateProfile(input: ProfileInput, today: Date = new Date()): ProfileErrors {
  const errors: ProfileErrors = {};

  const firstName = input.firstName.trim();
  if (!firstName) errors.firstName = "Escribe tu nombre.";
  else if (firstName.length > FIRST_NAME_MAX) errors.firstName = `Máximo ${FIRST_NAME_MAX} caracteres.`;

  const birthDate = parseDate(input.birthDate);
  if (!birthDate) errors.birthDate = "Indica tu fecha de nacimiento.";
  else if (birthDate > today) errors.birthDate = "La fecha no puede ser futura.";
  else if (ageOn(birthDate, today) < MIN_AGE) errors.birthDate = `Tienes que tener al menos ${MIN_AGE} años.`;
  else if (ageOn(birthDate, today) > 120) errors.birthDate = "Revisa la fecha de nacimiento.";

  if (input.bio.trim().length > BIO_MAX) errors.bio = `Máximo ${BIO_MAX} caracteres.`;

  if (!(input.gender in GENDERS)) errors.gender = "Elige una opción.";
  if (!(input.interestedIn in INTERESTED_IN)) errors.interestedIn = "Elige una opción.";

  if (!input.sensitiveConsent) {
    errors.sensitiveConsent = "Necesitamos tu consentimiento para guardar estos datos.";
  }

  return errors;
}

export function validatePhoto(file: { size: number; type: string }): string | null {
  if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) return "La foto tiene que ser JPG, PNG o WebP.";
  if (file.size > PHOTO_MAX_BYTES) return "La foto no puede pesar más de 5 MB.";
  return null;
}

export function photoCountError(count: number): string | null {
  if (count < MIN_PHOTOS) return `Sube al menos ${MIN_PHOTOS} fotos.`;
  if (count > MAX_PHOTOS) return `Puedes tener como máximo ${MAX_PHOTOS} fotos.`;
  return null;
}
