"use client";

import {
  CHILDREN,
  DRINKING,
  HEIGHT_MAX,
  HEIGHT_MIN,
  JOB_MAX,
  MAX_PROMPTS,
  PROMPT_ANSWER_MAX,
  PROMPTS,
  SMOKING,
  STUDIES,
  type Extras,
  type ExtrasErrors,
  type Filters,
  type PromptAnswer,
} from "@/lib/profileExtras";
import type { ProfileMore } from "./actions";

const field =
  "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-lg text-zinc-900 focus:border-rose-500 focus:outline-none";

// Datos opcionales y preguntas del perfil (D-23).
export function MoreAboutYou({
  value,
  onChange,
  errors,
}: {
  value: ProfileMore;
  onChange: (next: ProfileMore) => void;
  errors: ExtrasErrors;
}) {
  const setExtra = <K extends keyof Extras>(key: K, v: Extras[K]) =>
    onChange({ ...value, extras: { ...value.extras, [key]: v } });
  const setPrompts = (prompts: PromptAnswer[]) => onChange({ ...value, prompts });
  const used = new Set(value.prompts.map((p) => p.key));
  const error = (key: keyof Extras) =>
    errors[key] ? <span className="text-sm text-red-600">{errors[key]}</span> : null;

  return (
    <>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-medium">Más sobre ti (todo opcional)</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-zinc-500">Altura (cm)</span>
            <input
              type="number"
              inputMode="numeric"
              min={HEIGHT_MIN}
              max={HEIGHT_MAX}
              value={value.extras.heightCm ?? ""}
              onChange={(e) => setExtra("heightCm", e.target.value === "" ? null : Number(e.target.value))}
              className={field}
            />
            {error("heightCm")}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-zinc-500">Trabajo</span>
            <input
              value={value.extras.job}
              maxLength={JOB_MAX}
              onChange={(e) => setExtra("job", e.target.value)}
              className={field}
            />
            {error("job")}
          </label>
          <Select label="Estudios" options={STUDIES} value={value.extras.studies} onChange={(v) => setExtra("studies", v)} />
          <Select label="Tabaco" options={SMOKING} value={value.extras.smoking} onChange={(v) => setExtra("smoking", v)} />
          <Select label="Alcohol" options={DRINKING} value={value.extras.drinking} onChange={(v) => setExtra("drinking", v)} />
          <Select label="Hijos" options={CHILDREN} value={value.extras.children} onChange={(v) => setExtra("children", v)} />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-medium">
          Preguntas (opcional, hasta {MAX_PROMPTS}): dan tema de conversación
        </legend>
        {value.prompts.map((p, i) => (
          <div key={p.key} className="flex flex-col gap-1 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium">{PROMPTS[p.key as keyof typeof PROMPTS] ?? p.key}</span>
              <button
                type="button"
                onClick={() => setPrompts(value.prompts.filter((_, j) => j !== i))}
                aria-label="Quitar la pregunta"
                className="text-zinc-500"
              >
                ×
              </button>
            </div>
            <textarea
              rows={2}
              maxLength={PROMPT_ANSWER_MAX}
              value={p.answer}
              onChange={(e) =>
                setPrompts(value.prompts.map((q, j) => (j === i ? { ...q, answer: e.target.value } : q)))
              }
              className={field}
            />
            <span className="text-right text-xs text-zinc-500">
              {p.answer.length}/{PROMPT_ANSWER_MAX}
            </span>
          </div>
        ))}
        {value.prompts.length < MAX_PROMPTS && (
          <select
            value=""
            onChange={(e) => e.target.value && setPrompts([...value.prompts, { key: e.target.value, answer: "" }])}
            className={field}
            aria-label="Añadir una pregunta"
          >
            <option value="">+ Añadir una pregunta…</option>
            {Object.entries(PROMPTS)
              .filter(([key]) => !used.has(key))
              .map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </select>
        )}
      </fieldset>
    </>
  );
}

function Select({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Record<string, string>;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-zinc-500">{label}</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} className={field}>
        <option value="">Sin indicar</option>
        {Object.entries(options).map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

// Filtros de Descubrir (D-23).
export function DiscoverFilters({ value, onChange }: { value: Filters; onChange: (next: Filters) => void }) {
  const box = (key: keyof Filters, text: string) => (
    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={value[key]}
        onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
        className="h-5 w-5 accent-rose-600"
      />
      <span>{text}</span>
    </label>
  );
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-zinc-500">Filtros (solo se ve a quien lo indicó en su perfil)</span>
      {box("onlyNonSmokers", "Solo personas que no fuman")}
      {box("onlyWantsChildren", "Solo personas que quieren hijos")}
      {box("onlyVerified", "Solo perfiles verificados")}
    </div>
  );
}
