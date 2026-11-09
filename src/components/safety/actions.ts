"use server";

import { redirect } from "next/navigation";
import { isUuid } from "@/lib/chat";
import { cleanDetails, isReportReason } from "@/lib/safety";
import { getUser } from "@/lib/supabase/server";

// Bloquea: borra la coincidencia y el chat, y ninguno de los dos vuelve a ver al otro (D-14).
export async function blockUser(targetId: string): Promise<{ ok: boolean }> {
  if (!isUuid(targetId)) return { ok: false };
  const { supabase, user } = await getUser();
  if (!user) redirect("/entrar");
  const { error } = await supabase.rpc("block_user", { target: targetId });
  return { ok: !error };
}

// Denuncia con un motivo (y un texto opcional) y además bloquea.
export async function reportUser(targetId: string, reason: string, details?: string): Promise<{ ok: boolean }> {
  const note = cleanDetails(details);
  if (!isUuid(targetId) || !isReportReason(reason) || note === undefined) return { ok: false };
  const { supabase, user } = await getUser();
  if (!user) redirect("/entrar");
  const { error } = await supabase.rpc("report_user", { target: targetId, reason, details: note });
  return { ok: !error };
}
