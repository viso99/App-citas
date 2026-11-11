"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LocationSetter } from "@/components/LocationSetter";
import {
  MAX_AGE,
  MAX_DISTANCE_KM,
  MIN_DISTANCE_KM,
  validatePreferences,
  type PreferenceErrors,
  type Preferences,
} from "@/lib/discover";
import {
  BIO_MAX,
  MIN_AGE,
  GENDERS,
  INTERESTED_IN,
  MAX_PHOTOS,
  MIN_PHOTOS,
  moveItem,
  validatePhoto,
  validateProfile,
  type ProfileErrors,
  type ProfileInput,
} from "@/lib/profile";
import { INTEREST_GROUPS, MAX_INTERESTS } from "@/lib/interests";
import { createClient } from "@/lib/supabase/client";
import { PHOTOS_BUCKET } from "@/lib/supabase/config";
import { validateExtras, type ExtrasErrors } from "@/lib/profileExtras";
import { saveProfile, type ProfileMore } from "./actions";
import { DiscoverFilters, MoreAboutYou } from "./ProfileMoreFields";

export type Photo = { id: string; path: string; url: string | null };

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function ProfileForm({
  userId,
  initial,
  initialPhotos,
  initialPreferences,
  initialMore,
  hasProfile,
  locationUpdatedAt,
}: {
  userId: string;
  initial: ProfileInput;
  initialPhotos: Photo[];
  initialPreferences: Preferences;
  initialMore: ProfileMore;
  hasProfile: boolean;
  locationUpdatedAt: string | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProfileInput>(initial);
  const [prefs, setPrefs] = useState<Preferences>(initialPreferences);
  const [more, setMore] = useState<ProfileMore>(initialMore);
  const [locationSaved, setLocationSaved] = useState(Boolean(locationUpdatedAt));
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [errors, setErrors] = useState<ProfileErrors & PreferenceErrors & ExtrasErrors>({});
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function toggleInterest(key: string) {
    setValues((v) => {
      if (v.interests.includes(key)) return { ...v, interests: v.interests.filter((k) => k !== key) };
      if (v.interests.length >= MAX_INTERESTS) return v;
      return { ...v, interests: [...v.interests, key] };
    });
  }

  async function addPhoto(file: File) {
    const problem = validatePhoto(file);
    if (problem) return setMessage({ text: problem, ok: false });
    if (photos.length >= MAX_PHOTOS) return setMessage({ text: `Máximo ${MAX_PHOTOS} fotos.`, ok: false });

    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const path = `${userId}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
    const upload = await supabase.storage.from(PHOTOS_BUCKET).upload(path, file, { contentType: file.type });
    if (upload.error) {
      setBusy(false);
      return setMessage({ text: "No pudimos subir la foto.", ok: false });
    }
    const { data, error } = await supabase
      .from("profile_photos")
      .insert({ user_id: userId, storage_path: path, position: photos.length })
      .select("id")
      .single();
    if (error || !data) {
      await supabase.storage.from(PHOTOS_BUCKET).remove([path]);
      setBusy(false);
      return setMessage({ text: "No pudimos guardar la foto.", ok: false });
    }
    setPhotos((p) => [...p, { id: data.id, path, url: URL.createObjectURL(file) }]);
    setBusy(false);
  }

  // Guarda el orden: la posición de cada foto es su lugar en la lista (la primera es la principal).
  async function savePositions(list: Photo[]) {
    const supabase = createClient();
    const results = await Promise.all(
      list.map((p, position) => supabase.from("profile_photos").update({ position }).eq("id", p.id)),
    );
    return results.every((r) => !r.error);
  }

  async function movePhoto(from: number, to: number) {
    if (to < 0 || to >= photos.length) return;
    const before = photos;
    const after = moveItem(photos, from, to);
    setBusy(true);
    setMessage(null);
    setPhotos(after);
    if (!(await savePositions(after))) {
      setPhotos(before);
      await savePositions(before);
      setMessage({ text: "No pudimos cambiar el orden de las fotos.", ok: false });
    }
    setBusy(false);
  }

  async function removePhoto(photo: Photo) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("profile_photos").delete().eq("id", photo.id);
    if (!error) {
      await supabase.storage.from(PHOTOS_BUCKET).remove([photo.path]);
      const rest = photos.filter((x) => x.id !== photo.id);
      setPhotos(rest);
      await savePositions(rest);
    } else {
      setMessage({ text: "No pudimos quitar la foto.", ok: false });
    }
    setBusy(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = { ...validateProfile(values), ...validatePreferences(prefs), ...validateExtras(more.extras) };
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    const result = await saveProfile(values, prefs, more);
    setBusy(false);
    if (result.ok) {
      setMessage({ text: "Perfil guardado.", ok: true });
      // La primera vez se sigue a Descubrir, que pide la ubicación.
      if (!hasProfile) router.push("/descubrir");
      else router.refresh();
    } else {
      setErrors(result.errors);
      setMessage(result.message ? { text: result.message, ok: false } : null);
    }
  }

  const input =
    "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-lg text-zinc-900 focus:border-rose-500 focus:outline-none";
  const fieldError = (key: keyof ProfileInput | keyof Preferences) =>
    errors[key] ? <span className="text-sm text-red-600">{errors[key]}</span> : null;

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <span className="font-medium">
          Fotos ({photos.length} de {MAX_PHOTOS}, mínimo {MIN_PHOTOS})
        </span>
        {photos.length > 1 && (
          <span className="text-sm text-zinc-500">La primera es la que se ve primero. Usa las flechas para cambiar el orden.</span>
        )}
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div key={photo.id} className="relative aspect-[3/4] overflow-hidden rounded-xl bg-zinc-200">
              {photo.url && (
                // eslint-disable-next-line @next/next/no-img-element -- enlaces firmados y temporales
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => removePhoto(photo)}
                disabled={busy}
                aria-label="Quitar foto"
                className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-white"
              >
                ×
              </button>
              {index === 0 && (
                <span className="absolute left-1 top-1 rounded-full bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white">
                  Principal
                </span>
              )}
              {photos.length > 1 && (
                <div className="absolute inset-x-1 bottom-1 flex justify-between">
                  <button
                    type="button"
                    onClick={() => movePhoto(index, index - 1)}
                    disabled={busy || index === 0}
                    aria-label="Mover la foto antes"
                    className="h-8 w-8 rounded-full bg-black/60 text-white disabled:invisible"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => movePhoto(index, index + 1)}
                    disabled={busy || index === photos.length - 1}
                    aria-label="Mover la foto después"
                    className="h-8 w-8 rounded-full bg-black/60 text-white disabled:invisible"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="flex aspect-[3/4] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 text-3xl text-zinc-400">
              +
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) addPhoto(file);
                }}
              />
            </label>
          )}
        </div>
      </section>

      <label className="flex flex-col gap-2">
        <span className="font-medium">Nombre</span>
        <input value={values.firstName} onChange={(e) => set("firstName", e.target.value)} className={input} />
        {fieldError("firstName")}
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-medium">Fecha de nacimiento</span>
        <input
          type="date"
          value={values.birthDate}
          onChange={(e) => set("birthDate", e.target.value)}
          className={input}
        />
        {fieldError("birthDate")}
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-medium">Sobre ti (opcional)</span>
        <textarea
          rows={4}
          maxLength={BIO_MAX}
          value={values.bio}
          onChange={(e) => set("bio", e.target.value)}
          className={input}
        />
        <span className="text-right text-sm text-zinc-500">
          {values.bio.length}/{BIO_MAX}
        </span>
        {fieldError("bio")}
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-medium">
          Aficiones (opcional, hasta {MAX_INTERESTS}: llevas {values.interests.length})
        </legend>
        {INTEREST_GROUPS.map((group) => (
          <div key={group.name} className="flex flex-col gap-2">
            <span className="text-sm text-zinc-500">{group.name}</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(group.items).map(([key, label]) => {
                const checked = values.interests.includes(key);
                const full = !checked && values.interests.length >= MAX_INTERESTS;
                return (
                  <label
                    key={key}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      checked
                        ? "border-rose-600 bg-rose-600 text-white"
                        : full
                          ? "cursor-not-allowed border-zinc-200 text-zinc-400"
                          : "cursor-pointer border-zinc-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={full}
                      onChange={() => toggleInterest(key)}
                      className="sr-only"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        {fieldError("interests")}
      </fieldset>

      <MoreAboutYou value={more} onChange={setMore} errors={errors} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">Soy</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(GENDERS).map(([key, label]) => (
            <Choice
              key={key}
              name="gender"
              value={key}
              label={label}
              checked={values.gender === key}
              onChange={() => set("gender", key)}
            />
          ))}
        </div>
        {fieldError("gender")}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">Quiero conocer a</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(INTERESTED_IN).map(([key, label]) => (
            <Choice
              key={key}
              name="interestedIn"
              value={key}
              label={label}
              checked={values.interestedIn === key}
              onChange={() => set("interestedIn", key)}
            />
          ))}
        </div>
        {fieldError("interestedIn")}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-medium">Qué perfiles quieres ver</legend>
        <div className="flex items-center gap-2">
          <span>De</span>
          <AgeInput
            value={prefs.minAge}
            onChange={(minAge) => setPrefs((p) => ({ ...p, minAge }))}
            label="Edad mínima"
          />
          <span>a</span>
          <AgeInput
            value={prefs.maxAge}
            onChange={(maxAge) => setPrefs((p) => ({ ...p, maxAge }))}
            label="Edad máxima"
          />
          <span>años</span>
        </div>
        {fieldError("minAge")}
        {fieldError("maxAge")}
        <label className="flex flex-col gap-2">
          <span>Hasta {prefs.maxDistanceKm} km de distancia</span>
          <input
            type="range"
            min={MIN_DISTANCE_KM}
            max={MAX_DISTANCE_KM}
            value={prefs.maxDistanceKm}
            onChange={(e) => setPrefs((p) => ({ ...p, maxDistanceKm: Number(e.target.value) }))}
            className="accent-rose-600"
          />
        </label>
        {fieldError("maxDistanceKm")}
        <DiscoverFilters value={more.filters} onChange={(filters) => setMore((m) => ({ ...m, filters }))} />
      </fieldset>

      {hasProfile && (
        <section className="flex flex-col gap-2">
          <span className="font-medium">Tu ubicación</span>
          <span className="text-sm text-zinc-600 dark:text-zinc-300">
            {locationSaved
              ? "Guardada de forma aproximada (unos 2 km). Los demás solo ven a cuántos kilómetros estás."
              : "Todavía no la has indicado. Sin ubicación no podemos enseñarte perfiles."}
          </span>
          <LocationSetter
            compact
            onSaved={() => {
              setLocationSaved(true);
              setMessage({ text: "Ubicación guardada.", ok: true });
            }}
          />
        </section>
      )}

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={values.sensitiveConsent}
          onChange={(e) => set("sensitiveConsent", e.target.checked)}
          className="mt-1 h-5 w-5 accent-rose-600"
        />
        <span className="text-sm text-zinc-600 dark:text-zinc-300">
          Acepto que se guarden mi género y a quién quiero conocer para mostrarme perfiles. Puedo retirar este
          consentimiento borrando mi perfil.
        </span>
      </label>
      {fieldError("sensitiveConsent")}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-rose-600 px-6 py-3 text-lg font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
      >
        {busy ? "Guardando…" : "Guardar perfil"}
      </button>
      {message && <p className={message.ok ? "text-green-700" : "text-red-600"}>{message.text}</p>}
    </form>
  );
}

function Choice(props: { name: string; value: string; label: string; checked: boolean; onChange: () => void }) {
  return (
    <label
      className={`cursor-pointer rounded-full border px-4 py-2 ${
        props.checked ? "border-rose-600 bg-rose-600 text-white" : "border-zinc-300"
      }`}
    >
      <input
        type="radio"
        name={props.name}
        value={props.value}
        checked={props.checked}
        onChange={props.onChange}
        className="sr-only"
      />
      {props.label}
    </label>
  );
}

function AgeInput(props: { value: number; onChange: (value: number) => void; label: string }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={MIN_AGE}
      max={MAX_AGE}
      aria-label={props.label}
      value={Number.isNaN(props.value) ? "" : props.value}
      onChange={(e) => props.onChange(e.target.value === "" ? Number.NaN : Number(e.target.value))}
      className="w-20 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-center text-lg text-zinc-900 focus:border-rose-500 focus:outline-none"
    />
  );
}
