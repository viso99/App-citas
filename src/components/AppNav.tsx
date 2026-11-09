import Link from "next/link";

// Barra de abajo para moverse entre las pantallas principales.
export function AppNav({ current }: { current: "descubrir" | "coincidencias" | "perfil" }) {
  const item = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex-1 py-3 text-center font-medium ${active ? "text-rose-600" : "text-zinc-500"}`}
    >
      {label}
    </Link>
  );
  return (
    <nav className="sticky bottom-0 flex border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
      {item("/descubrir", "Descubrir", current === "descubrir")}
      {item("/coincidencias", "Coincidencias", current === "coincidencias")}
      {item("/perfil", "Perfil", current === "perfil")}
    </nav>
  );
}
