"use client";

import { useState } from "react";
import {
  BIO_MAX,
  GENDERS,
  INTERESTED_IN,
  MAX_PHOTOS,
  MIN_PHOTOS,
  validatePhoto,
  validateProfile,
  type ProfileErrors,
  type ProfileInput,
} from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import { PHOTOS_BUCKET } from "@/lib/supabase/config";
import { saveProfile } from "./actions";

export type Photo = { id: string; path: string; url: string | null };

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function ProfileForm({
  userId,
  initial,
  initialPhotos,
}: {
  userId: string;
  initial: ProfileInput;
  initialPhotos: Photo[];
}) {
  const [values, setValues] = useState<ProfileInput>(initial);
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) {
    setValues((v) => ({ ...v, [key]: value }));
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

  async function removePhoto(photo: Photo) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("profile_photos").delete().eq("id", photo.id);
    if (!error) {
      await supabase.storage.from(PHOTOS_BUCKET).remove([photo.path]);
      setPhotos((p) => p.filter((x) => x.id !== photo.id));
    } else {
      setMessage({ text: "No pudimos quitar la foto.", ok: false });
    }
    setBusy(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateProfile(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    const result = await saveProfile(values);
    setBusy(false);
    if (result.ok) setMessage({ text: "Perfil guardado.", ok: true });
    else {
      setErrors(result.errors);
      setMessage(result.message ? { text: result.message, ok: false } : null);
    }
  }

  const input =
    "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-lg text-zinc-900 focus:border-rose-500 focus:outline-none";
  const fieldError = (key: keyof ProfileInput) =>
    errors[key] ? <span className="text-sm text-red-600">{errors[key]}</span> : null;

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <span className="font-medium">
          Fotos ({photos.length} de {MAX_PHOTOS}, mínimo {MIN_PHOTOS})
        </span>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
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
        <input type="date" value={values.birthDate} onChange={(e) => set("birthDate", e.target.value)} className={input} />
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

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">Soy</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(GENDERS).map(([key, label]) => (
            <Choice key={key} name="gender" value={key} label={label} checked={values.gender === key} onChange={() => set("gender", key)} />
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
      <input type="radio" name={props.name} value={props.value} checked={props.checked} onChange={props.onChange} className="sr-only" />
      {props.label}
    </label>
  );
}
