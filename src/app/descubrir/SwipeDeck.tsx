"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { distanceLabel } from "@/lib/discover";
import { nextCards, swipe } from "./actions";
import type { Card } from "./cards";

const SWIPE_THRESHOLD = 100; // píxeles de arrastre para decidir
const TAP_SLOP = 8; // menos que esto es un toque, no un arrastre

type Choice = "me_gusta" | "paso";

export function SwipeDeck({ initialCards }: { initialCards: Card[] }) {
  const [cards, setCards] = useState(initialCards);
  const [photo, setPhoto] = useState(0);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<Choice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(initialCards.length === 0);
  const decided = useRef(new Set<string>());
  const loading = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const card = cards[0];

  // Pide más perfiles cuando quedan pocos.
  useEffect(() => {
    if (exhausted || loading.current || cards.length > 2) return;
    loading.current = true;
    nextCards()
      .then((more) => {
        const fresh = more.filter((c) => !decided.current.has(c.id));
        if (fresh.length === 0) setExhausted(true);
        setCards((current) => {
          const ids = new Set(current.map((c) => c.id));
          return [...current, ...fresh.filter((c) => !ids.has(c.id))];
        });
      })
      .finally(() => {
        loading.current = false;
      });
  }, [cards.length, exhausted]);

  function decide(choice: Choice) {
    if (!card || leaving) return;
    const target = card;
    decided.current.add(target.id);
    setLeaving(choice);
    setError(null);
    setTimeout(() => {
      setCards((current) => current.filter((c) => c.id !== target.id));
      setLeaving(null);
      setDx(0);
      setPhoto(0);
    }, 200);
    swipe(target.id, choice).then(({ ok }) => {
      if (!ok) setError("No pudimos guardar tu respuesta. Comprueba la conexión.");
    });
  }

  function onPointerDown(e: React.PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (start.current) setDx(e.clientX - start.current.x);
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!start.current || !card) return;
    const moved = e.clientX - start.current.x;
    start.current = null;
    setDragging(false);
    if (Math.abs(moved) < TAP_SLOP) {
      // Toque: mitad izquierda, foto anterior; mitad derecha, siguiente.
      const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const next = e.clientX - box.left > box.width / 2 ? photo + 1 : photo - 1;
      setPhoto(Math.min(Math.max(next, 0), card.photos.length - 1));
      setDx(0);
    } else if (moved > SWIPE_THRESHOLD) decide("me_gusta");
    else if (moved < -SWIPE_THRESHOLD) decide("paso");
    else setDx(0);
  }

  if (!card) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg">{exhausted ? "No hay más perfiles cerca por ahora." : "Buscando perfiles…"}</p>
        {exhausted && (
          <p className="text-zinc-600 dark:text-zinc-300">
            Vuelve más tarde o amplía la distancia y las edades en{" "}
            <Link href="/perfil" className="text-rose-600 underline">
              tu perfil
            </Link>
            .
          </p>
        )}
        {error && <p className="text-red-600">{error}</p>}
      </div>
    );
  }

  const offset = leaving === "me_gusta" ? 600 : leaving === "paso" ? -600 : dx;
  const hint = offset > TAP_SLOP * 4 ? "me_gusta" : offset < -TAP_SLOP * 4 ? "paso" : null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div
        key={card.id}
        role="group"
        aria-label={`${card.firstName}, ${card.age}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          start.current = null;
          setDragging(false);
          setDx(0);
        }}
        style={{
          transform: `translateX(${offset}px) rotate(${offset / 20}deg)`,
          transition: dragging ? "none" : "transform 200ms ease-out",
          touchAction: "pan-y",
        }}
        className="relative h-[calc(100dvh-15rem)] max-h-[640px] min-h-80 w-full select-none overflow-hidden rounded-3xl bg-zinc-200 shadow-lg"
      >
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
        {hint && (
          <span
            className={`absolute top-8 rounded-lg border-4 px-3 py-1 text-2xl font-bold uppercase ${
              hint === "me_gusta" ? "left-6 -rotate-12 border-green-500 text-green-500" : "right-6 rotate-12 border-red-500 text-red-500"
            }`}
          >
            {hint === "me_gusta" ? "Me gusta" : "Paso"}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/80 to-transparent p-5 pt-16 text-white">
          <p className="text-2xl font-bold">
            {card.firstName}, {card.age}
          </p>
          <p className="text-sm text-white/80">{distanceLabel(card.distanceKm)}</p>
          {card.bio && <p className="line-clamp-3 text-white/90">{card.bio}</p>}
        </div>
      </div>

      <div className="flex justify-center gap-8">
        <button
          type="button"
          onClick={() => decide("paso")}
          disabled={Boolean(leaving)}
          aria-label="Paso"
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-zinc-300 bg-white text-3xl text-zinc-500 shadow"
        >
          ✕
        </button>
        <button
          type="button"
          onClick={() => decide("me_gusta")}
          disabled={Boolean(leaving)}
          aria-label="Me gusta"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 text-3xl text-white shadow"
        >
          ♥
        </button>
      </div>
      {error && <p className="text-center text-red-600">{error}</p>}
    </div>
  );
}
