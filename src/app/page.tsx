import Link from "next/link";
import { APP_DESCRIPTION, APP_NAME } from "@/config/app";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-12">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-bold tracking-tight text-rose-600">{APP_NAME}</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-300">{APP_DESCRIPTION}</p>
      </div>
      <Link
        href="/entrar"
        className="rounded-full bg-rose-600 px-6 py-3 text-center text-lg font-semibold text-white hover:bg-rose-700"
      >
        Empezar
      </Link>
      <p className="text-sm text-zinc-500">Solo para mayores de 18 años.</p>
    </main>
  );
}
