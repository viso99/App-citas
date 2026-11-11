"use client";

import { useState } from "react";
import { CardFace, ProfileDetails } from "../../descubrir/CardView";
import type { Card } from "../../descubrir/cards";

// La tarjeta propia, con las fotos que se pasan al tocar, y debajo todo el perfil (D-33).
export function PreviewCard({ card }: { card: Card }) {
  const [photo, setPhoto] = useState(0);
  return (
    <>
      <div
        role="group"
        aria-label={`${card.firstName}, ${card.age}`}
        onClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const next = e.clientX - box.left > box.width / 2 ? photo + 1 : photo - 1;
          setPhoto(Math.min(Math.max(next, 0), Math.max(card.photos.length - 1, 0)));
        }}
        className="relative h-[calc(100dvh-16rem)] max-h-[640px] min-h-80 w-full select-none overflow-hidden rounded-3xl bg-zinc-200 shadow-lg"
      >
        <CardFace card={card} photo={photo} />
      </div>
      <section className="flex flex-col gap-4 rounded-3xl border border-zinc-200 p-6 dark:border-zinc-800">
        <ProfileDetails card={card} />
      </section>
    </>
  );
}
