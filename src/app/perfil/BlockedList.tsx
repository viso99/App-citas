import { getUser } from "@/lib/supabase/server";
import { UnblockButton } from "./UnblockButton";

type Row = { id: string; first_name: string; blocked_at: string };

const dateFormat = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", timeZone: "Europe/Madrid" });

// Personas que bloqueé, con la opción de desbloquearlas (D-21).
export async function BlockedList() {
  const { supabase, user } = await getUser();
  if (!user) return null;
  const { data, error } = await supabase.rpc("my_blocks");
  if (error) return null;
  const rows = (data ?? []) as Row[];

  return (
    <details className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <summary className="cursor-pointer font-medium">Personas bloqueadas ({rows.length})</summary>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No has bloqueado a nadie.</p>
      ) : (
        <>
          <p className="mt-3 text-sm text-zinc-500">
            Si desbloqueas a alguien, podéis volver a veros en Descubrir. La conversación borrada no vuelve.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3">
                <span>
                  {r.first_name}{" "}
                  <span className="text-sm text-zinc-500">· desde el {dateFormat.format(new Date(r.blocked_at))}</span>
                </span>
                <UnblockButton targetId={r.id} name={r.first_name} />
              </li>
            ))}
          </ul>
        </>
      )}
    </details>
  );
}
