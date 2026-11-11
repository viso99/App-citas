import { distanceLabel } from "@/lib/discover";
import type { Card } from "./cards";

// Cómo se ve una tarjeta de Descubrir. Lo usan Descubrir y "Ver mi perfil como lo ven los
// demás" (D-33), para que la vista previa sea exactamente igual.

// La foto con la información encima. `children` son los botones y avisos que van sobre la foto.
export function CardFace({ card, photo, children }: { card: Card; photo: number; children?: React.ReactNode }) {
  return (
    <>
      {card.photos[photo] && (
        // eslint-disable-next-line @next/next/no-img-element -- enlaces firmados y temporales
        <img src={card.photos[photo]} alt="" draggable={false} className="h-full w-full object-cover" />
      )}
      {card.photos.length > 1 && (
        <div className="absolute inset-x-3 top-3 flex gap-1">
          {card.photos.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i === photo ? "bg-white" : "bg-white/40"}`} />
          ))}
        </div>
      )}
      {card.superlikedMe && (
        <span className="absolute left-3 top-6 rounded-full bg-sky-500 px-3 py-1 text-sm font-semibold text-white shadow">
          ★ Te ha dado un superlike
        </span>
      )}
      {children}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/80 to-transparent p-5 pt-16 text-white">
        {card.noteToMe && (
          <p className="mb-2 w-fit max-w-full rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm text-zinc-900 shadow">
            <span className="block text-xs font-semibold text-rose-600">Te ha escrito:</span>
            {card.noteToMe}
          </p>
        )}
        <p className="text-2xl font-bold">
          {card.firstName}, {card.age}
          {card.verified && (
            <span className="ml-2 align-middle text-base text-sky-300" title="Perfil verificado">
              ✔<span className="sr-only"> Perfil verificado</span>
            </span>
          )}
        </p>
        <p className="text-sm text-white/80">
          {card.activeRecently && (
            <span className="mr-2 font-semibold text-green-400">
              <span aria-hidden>● </span>Activo hace poco
            </span>
          )}
          {card.traveling && (
            <span className="mr-2 font-semibold text-amber-300">
              <span aria-hidden>✈️ </span>De viaje por aquí
            </span>
          )}
          {distanceLabel(card.distanceKm)}
        </p>
        {card.lookingFor && (
          <p className="w-fit rounded-full bg-white/20 px-3 py-0.5 text-sm font-medium">
            <span className="sr-only">Busca: </span>
            <span aria-hidden>🎯 </span>
            {card.lookingFor}
          </p>
        )}
        {card.bio && <p className="line-clamp-3 text-white/90">{card.bio}</p>}
        {card.interests.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-1" aria-label="Aficiones">
            {card.interests.map((i) => (
              <li
                key={i.key}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  i.shared ? "bg-rose-600 font-semibold text-white" : "bg-white/20 text-white"
                }`}
              >
                {i.label}
                {i.shared && <span className="sr-only"> (en común)</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

// Todo el perfil: descripción, datos, preguntas y aficiones (D-23).
export function ProfileDetails({ card }: { card: Card }) {
  return (
    <>
      <h2 className="text-2xl font-bold">
        {card.firstName}, {card.age} {card.verified && <span className="text-base text-sky-600">✔ Verificado</span>}
      </h2>
      <p className="text-sm text-zinc-500">
        {card.activeRecently && <span className="mr-2 font-semibold text-green-600">● Activo hace poco</span>}
        {card.traveling && <span className="mr-2 font-semibold text-amber-600">✈️ De viaje por aquí</span>}
        {distanceLabel(card.distanceKm)}
      </p>
      {card.lookingFor && (
        <div className="rounded-2xl bg-rose-50 p-4 dark:bg-rose-950">
          <p className="text-sm text-zinc-500">Busca</p>
          <p className="text-lg font-semibold">{card.lookingFor}</p>
        </div>
      )}
      {card.bio && <p className="whitespace-pre-wrap">{card.bio}</p>}
      {card.details.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {card.details.map((d) => (
            <li key={d} className="rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800">
              {d}
            </li>
          ))}
        </ul>
      )}
      {card.prompts.map((p) => (
        <div key={p.question} className="rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-800">
          <p className="text-sm text-zinc-500">{p.question}</p>
          <p className="text-lg font-semibold">{p.answer}</p>
        </div>
      ))}
      {card.interests.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Aficiones">
          {card.interests.map((i) => (
            <li
              key={i.key}
              className={`rounded-full px-3 py-1 text-sm ${
                i.shared ? "bg-rose-600 font-semibold text-white" : "bg-zinc-100 dark:bg-zinc-800"
              }`}
            >
              {i.label}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
