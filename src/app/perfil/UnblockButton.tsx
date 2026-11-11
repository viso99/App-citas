"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { unblockUser } from "@/components/safety/actions";

export function UnblockButton({ targetId, name }: { targetId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function unblock() {
    setBusy(true);
    setFailed(false);
    const { ok } = await unblockUser(targetId);
    setBusy(false);
    if (ok) router.refresh();
    else setFailed(true);
  }

  return (
    <button
      type="button"
      onClick={unblock}
      disabled={busy}
      aria-label={`Desbloquear a ${name}`}
      className={`shrink-0 rounded-full border px-3 py-1 text-sm disabled:opacity-50 ${
        failed ? "border-red-300 text-red-600" : "border-zinc-300 dark:border-zinc-700"
      }`}
    >
      {busy ? "…" : failed ? "Reintentar" : "Desbloquear"}
    </button>
  );
}
