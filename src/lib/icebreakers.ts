// Ideas para el primer mensaje (D-29). Sin dependencias de Next ni Supabase: lo usan el chat y
// las pruebas. Salen de las aficiones en común y de las preguntas que respondió la otra persona.
import { INTERESTS } from "./interests";
import { PROMPTS, type PromptAnswer } from "./profileExtras";

export const MAX_ICEBREAKERS = 3;

const GENERIC = [
  "¿Qué es lo mejor que te ha pasado esta semana?",
  "Si mañana tuvieras el día libre, ¿qué harías?",
  "¿Café, cerveza o paseo para una primera cita?",
];

// "¿Qué te tira más de …?" con la afición en minúscula salvo que sea un nombre propio.
function aboutInterest(label: string): string {
  return `He visto que también te gusta ${label.toLowerCase()}. ¿Cómo empezaste?`;
}

function aboutPrompt(question: string): string {
  const q = question.replace(/…$/, "").trim();
  return `Me ha gustado tu respuesta a «${q}». ¿Me cuentas más?`;
}

export function icebreakers(sharedInterests: readonly string[], prompts: readonly PromptAnswer[]): string[] {
  const ideas: string[] = [];
  for (const p of prompts) {
    const question = (PROMPTS as Record<string, string>)[p.key];
    if (question) ideas.push(aboutPrompt(question));
    if (ideas.length >= 1) break;
  }
  for (const key of sharedInterests) {
    const label = INTERESTS[key];
    if (label) ideas.push(aboutInterest(label));
    if (ideas.length >= 2) break;
  }
  for (const g of GENERIC) {
    if (ideas.length >= MAX_ICEBREAKERS) break;
    ideas.push(g);
  }
  return ideas.slice(0, MAX_ICEBREAKERS);
}
