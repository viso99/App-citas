import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { pushPayload, type PushKind } from "@/lib/push";

// Envía el aviso a los móviles de la otra persona (D-24). Si las claves no están configuradas
// (variables VAPID en Vercel), no hace nada. Nunca hace fallar la acción que lo llama.
export async function sendPush(
  supabase: SupabaseClient,
  otherId: string,
  kind: Exclude<PushKind, "reminder">,
): Promise<void> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return;

  try {
    const { data, error } = await supabase.rpc("push_targets", { other: otherId, kind });
    if (error || !data) return;
    const payload = JSON.stringify(pushPayload(kind, kind === "message" ? await myId(supabase) : otherId));
    await Promise.all(
      (data as { endpoint: string; p256dh: string; auth: string }[]).map(async (t) => {
        try {
          await webpush.sendNotification(
            { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
            payload,
            { vapidDetails: { subject, publicKey, privateKey }, TTL: 60 * 60 * 24 },
          );
        } catch (e) {
          // 404 o 410: ese móvil ya no acepta avisos; se borra la dirección.
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await supabase.rpc("forget_push_endpoint", { other: otherId, gone: t.endpoint });
          }
        }
      }),
    );
  } catch {
    // Un aviso que no sale no debe romper el chat ni Descubrir.
  }
}

// En un aviso de mensaje, el enlace lleva al chat con quien lo envía (yo, visto desde el otro lado).
async function myId(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? "";
}
