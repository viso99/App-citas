"use client";

import Link from "next/link";
import { useState } from "react";
import { APP_NAME } from "@/config/app";

// Bienvenida al registrarse (D-34): tres pantallas cortas antes de crear el perfil.
const SLIDES = [
  {
    emoji: "👋",
    title: `Te damos la bienvenida a ${APP_NAME}`,
    points: [
      "Crea tu perfil con tu nombre, tu edad y al menos 2 fotos.",
      "Solo se ve tu nombre, tu edad y la distancia aproximada. Nunca tu ubicación exacta.",
    ],
  },
  {
    emoji: "♥",
    title: "Así funciona",
    points: [
      "Desliza a la derecha si te gusta alguien y a la izquierda si no. También puedes usar los botones.",
      "Si os gustáis los dos, es una coincidencia y ya podéis hablar.",
      "Con 💬 puedes darle me gusta con un mensaje, y cada día tienes un ★ superlike.",
    ],
  },
  {
    emoji: "🛡️",
    title: "Tu seguridad, primero",
    points: [
      "No compartas tu dirección, datos bancarios ni contraseñas.",
      "Para la primera cita, queda en un sitio público y cuéntaselo a alguien de confianza.",
      "Si alguien te molesta, puedes bloquearlo o denunciarlo desde el menú ⋯ de su perfil o del chat.",
    ],
  },
];

export default function WelcomePage() {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const last = step === SLIDES.length - 1;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-between gap-8 px-6 py-12">
      <div className="flex justify-center gap-2" aria-hidden>
        {SLIDES.map((_, i) => (
          <span key={i} className={`h-2 w-8 rounded-full ${i === step ? "bg-rose-600" : "bg-zinc-200 dark:bg-zinc-800"}`} />
        ))}
      </div>
      <section className="flex flex-col items-center gap-6 text-center" aria-live="polite">
        <span className="text-6xl" aria-hidden>
          {slide.emoji}
        </span>
        <h1 className="text-3xl font-bold tracking-tight">{slide.title}</h1>
        <ul className="flex flex-col gap-3 text-left text-lg text-zinc-700 dark:text-zinc-300">
          {slide.points.map((p) => (
            <li key={p} className="flex gap-3">
              <span className="text-rose-600" aria-hidden>
                •
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </section>
      <div className="flex flex-col gap-3">
        {last ? (
          <Link href="/perfil" className="rounded-full bg-rose-600 px-6 py-3 text-center text-lg font-semibold text-white">
            Crear mi perfil
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="rounded-full bg-rose-600 px-6 py-3 text-lg font-semibold text-white"
          >
            Siguiente
          </button>
        )}
        {step > 0 ? (
          <button type="button" onClick={() => setStep(step - 1)} className="text-zinc-500 underline">
            Atrás
          </button>
        ) : (
          <Link href="/perfil" className="text-center text-zinc-500 underline">
            Saltar
          </Link>
        )}
      </div>
    </main>
  );
}
