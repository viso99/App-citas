"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "./actions";

// Salir. Antes quita los avisos de este móvil (D-24): si después entra otra persona en el
// mismo móvil, no recibe los avisos de esta cuenta.
export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration("/sw.js") : undefined;
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await createClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
    } catch {
      // Salir siempre funciona, aunque no se puedan quitar los avisos.
    }
    await signOut();
  }

  return (
    <button type="button" onClick={onClick} disabled={busy} className="text-zinc-500 underline disabled:opacity-50">
      {busy ? "Saliendo…" : "Salir"}
    </button>
  );
}
