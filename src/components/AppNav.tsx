import Link from "next/link";
import { Suspense } from "react";
import { getUser } from "@/lib/supabase/server";

// Barra de abajo para moverse entre las pantallas principales. Coincidencias lleva un punto
// cuando hay una coincidencia nueva o un mensaje sin leer (D-19).
export function AppNav({ current }: { current: "descubrir" | "coincidencias" | "perfil" }) {
  const item = (href: string, label: string, active: boolean, extra?: React.ReactNode) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex-1 py-3 text-center font-medium ${active ? "text-rose-600" : "text-zinc-500"}`}
    >
      {label}
      {extra}
    </Link>
  );
  return (
    <nav className="sticky bottom-0 flex border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
      {item("/descubrir", "Descubrir", current === "descubrir")}
      {item(
        "/coincidencias",
        "Coincidencias",
        current === "coincidencias",
        <Suspense fallback={null}>
          <UnreadDot />
        </Suspense>,
      )}
      {item("/perfil", "Perfil", current === "perfil")}
    </nav>
  );
}

async function UnreadDot() {
  const { supabase, user } = await getUser();
  if (!user) return null;
  // De paso apunta que la persona usa la app, para "Activo hace poco" (D-28).
  const [{ data }] = await Promise.all([supabase.rpc("unread_matches_count"), supabase.rpc("touch_activity")]);
  if (typeof data !== "number" || data < 1) return null;
  return (
    <>
      <span aria-hidden className="absolute top-2 ml-1 inline-block h-2.5 w-2.5 rounded-full bg-rose-600" />
      <span className="sr-only"> ({data === 1 ? "1 novedad" : `${data} novedades`})</span>
    </>
  );
}
