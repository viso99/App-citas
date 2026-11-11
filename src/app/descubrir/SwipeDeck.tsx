"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SafetyMenu } from "@/components/safety/SafetyMenu";
import { distanceLabel } from "@/lib/discover";
import { nextCards, superlike, swipe, undoPass } from "./actions";
import type { Card } from "./cards";

const SWIPE_THRESHOLD = 100; // píxeles de arrastre para decidir
const TAP_SLOP = 8; // menos que esto es un toque, no un arrastre

type Choice = "me_gusta" | "paso" | "superlike";

export function SwipeDeck({ initialCards, initialSuperlikes }: { initialCards: Card[]; initialSuperlikes: number }) {
  const [cards, setCards] = useState(initialCards);
  const [superlikesLeft, setSuperlikesLeft] = useState(initialSuperlikes);
  const [photo, setPhoto] = useState(0);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<Choice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(initialCards.length === 0);
  const [matchWith, setMatchWith] = useState<Card | null>(null);
  // El último perfil al que se le dio "paso", para poder deshacerlo (D-21).
  const [lastPassed, setLastPassed] = useState<{ card: Card; saved: Promise<unknown> } | null>(null);
  const [undoing, setUndoing] = useState(false);
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
    if (choice === "superlike" && superlikesLeft < 1) {
      setError("Ya has usado tu superlike de hoy. Mañana tendrás otro.");
      return;
    }
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
    if (choice === "superlike") {
      setLastPassed(null);
      setSuperlikesLeft(0);
      superlike(target.id).then(({ ok, match, limit }) => {
        if (limit) setError("Ya habías usado tu superlike de hoy, así que no se ha enviado.");
        else if (!ok) {
          setSuperlikesLeft(1);
          setError("No pudimos enviar el superlike. Comprueba la conexión.");
        } else if (match) setMatchWith(target);
      });
      return;
    }
    const saved = swipe(target.id, choice).then(({ ok, match }) => {
      if (!ok) setError("No pudimos guardar tu respuesta. Comprueba la conexión.");
      else if (match) setMatchWith(target);
    });
    setLastPassed(choice === "paso" ? { card: target, saved } : null);
  }

  async function undo() {
    if (!lastPassed || undoing || leaving) return;
    const { card: back, saved } = lastPassed;
    setUndoing(true);
    setError(null);
    await saved;
    const { ok } = await undoPass(back.id);
    setUndoing(false);
    if (!ok) {
      setError("No pudimos deshacer el último paso.");
      return;
    }
    setLastPassed(null);
    decided.current.delete(back.id);
    setExhausted(false);
    setCards((current) => [back, ...current.filter((c) => c.id !== back.id)]);
    setPhoto(0);
    setDx(0);
  }

  const undoButton = lastPassed && (
    <button
      type="button"
      onClick={undo}
      disabled={undoing || Boolean(leaving)}
      className="mx-auto rounded-full border border-zinc-300 px-4 py-1.5 text-sm text-zinc-600 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
    >
      {undoing ? "Recuperando…" : `↶ Deshacer el paso a ${lastPassed.card.firstName}`}
    </button>
  );

  // Tras bloquear o denunciar, la tarjeta se va sin registrar "paso" ni "me gusta".
  function removeBlocked(id: string) {
    decided.current.add(id);
    setCards((current) => current.filter((c) => c.id !== id));
    setDx(0);
    setPhoto(0);
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

  const overlay = matchWith && <MatchOverlay card={matchWith} onClose={() => setMatchWith(null)} />;

  if (!card) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        {overlay}
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
        {undoButton}
        {error && <p className="text-red-600">{error}</p>}
      </div>
    );
  }

  const offset = leaving === "me_gusta" ? 600 : leaving === "paso" ? -600 : leaving === "superlike" ? 0 : dx;
  const lift = leaving === "superlike" ? -800 : 0;
  const hint: Choice | null =
    leaving === "superlike" ? "superlike" : offset > TAP_SLOP * 4 ? "me_gusta" : offset < -TAP_SLOP * 4 ? "paso" : null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      {overlay}
      <div className="relative">
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
            transform: `translate(${offset}px, ${lift}px) rotate(${offset / 20}deg)`,
            transition: dragging ? "none" : "transform 200ms ease-out",
            touchAction: "pan-y",
          }}
          className={`relative h-[calc(100dvh-15rem)] max-h-[640px] min-h-80 w-full select-none overflow-hidden rounded-3xl bg-zinc-200 shadow-lg ${
            card.superlikedMe ? "ring-4 ring-sky-500" : ""
          }`}
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
          {card.superlikedMe && (
            <span className="absolute left-3 top-6 rounded-full bg-sky-500 px-3 py-1 text-sm font-semibold text-white shadow">
              ★ Te ha dado un superlike
            </span>
          )}
          {hint && (
            <span
              className={`absolute top-8 rounded-lg border-4 px-3 py-1 text-2xl font-bold uppercase ${
                hint === "me_gusta"
                  ? "left-6 -rotate-12 border-green-500 text-green-500"
                  : hint === "paso"
                    ? "right-6 rotate-12 border-red-500 text-red-500"
                    : "inset-x-0 bottom-40 mx-auto w-fit border-sky-500 text-sky-500"
              }`}
            >
              {hint === "me_gusta" ? "Me gusta" : hint === "paso" ? "Paso" : "Superlike"}
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/80 to-transparent p-5 pt-16 text-white">
            <p className="text-2xl font-bold">
              {card.firstName}, {card.age}
            </p>
            <p className="text-sm text-white/80">{distanceLabel(card.distanceKm)}</p>
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
        </div>
        {!leaving && !dragging && (
          <SafetyMenu
            key={card.id}
            targetId={card.id}
            name={card.firstName}
            onDone={() => removeBlocked(card.id)}
            className="absolute right-3 top-6 bg-black/40 text-white"
          />
        )}
      </div>

      <div className="flex items-center justify-center gap-6">
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
          onClick={() => decide("superlike")}
          disabled={Boolean(leaving)}
          aria-label={superlikesLeft > 0 ? "Superlike (te queda 1 hoy)" : "Superlike (ya lo has usado hoy)"}
          className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl shadow ${
            superlikesLeft > 0 ? "bg-sky-500 text-white" : "border-2 border-zinc-300 bg-white text-zinc-300"
          }`}
        >
          ★
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
      {undoButton}
      {error && <p className="text-center text-red-600">{error}</p>}
    </div>
  );
}

function MatchOverlay({ card, onClose }: { card: Card; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-title"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-rose-600/95 px-6 text-center text-white"
    >
      <h2 id="match-title" className="text-4xl font-bold">
        ¡Es una coincidencia!
      </h2>
      {card.photos[0] && (
        // eslint-disable-next-line @next/next/no-img-element -- enlaces firmados y temporales
        <img src={card.photos[0]} alt="" className="h-40 w-40 rounded-full border-4 border-white object-cover" />
      )}
      <p className="text-lg">A {card.firstName} y a ti os habéis gustado.</p>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link href="/coincidencias" className="rounded-full bg-white px-6 py-3 text-lg font-semibold text-rose-600">
          Ver mis coincidencias
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border-2 border-white px-6 py-3 text-lg font-semibold"
        >
          Seguir descubriendo
        </button>
      </div>
    </div>
  );
}
