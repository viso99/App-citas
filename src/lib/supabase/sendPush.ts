import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { pushPayload, type PushKind } from "@/lib/push";

// Envía el aviso a los móviles de la otra persona (D-24). La sesión de quien actúa solo pregunta
// si puede avisar (can_notify); las direcciones del otro móvil las lee el servidor con la clave
// secreta, para que nunca lleguen a nadie más (ver docs/seguridad.md). Si faltan las claves
// (VAPID o SUPABASE_SECRET_KEY en Vercel), no hace nada. Nunca hace fallar la acción que lo llama.
export async function sendPush(
  supabase: SupabaseClient,
  otherId: string,
  kind: Exclude<PushKind, "reminder">,
): Promise<void> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!publicKey || !privateKey || !subject || !url || !secretKey) return;

  try {
    const { data: allowed, error } = await supabase.rpc("can_notify", { other: otherId, kind });
    if (error || allowed !== true) return;

    const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", otherId);
    if (!data) return;

    const payload = JSON.stringify(pushPayload(kind, kind === "message" ? await myId(supabase) : otherId));
    await Promise.all(
      data.map(async (t) => {
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
            await admin.from("push_subscriptions").delete().eq("user_id", otherId).eq("endpoint", t.endpoint);
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
