import Link from "next/link";

export default function AccountDeletedPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-12 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Tu cuenta se ha eliminado</h1>
      <p className="text-zinc-600 dark:text-zinc-300">
        Hemos borrado tu perfil, tus fotos, tus coincidencias y tus conversaciones.
      </p>
      <Link href="/" className="text-rose-600 underline">
        Volver al inicio
      </Link>
    </main>
  );
}
