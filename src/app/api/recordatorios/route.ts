import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { pushPayload } from "@/lib/push";

// Recordatorio de chats parados (D-40). Lo llama una vez al día la tarea programada de Vercel
// (vercel.json), que manda la cabecera "Authorization: Bearer <CRON_SECRET>". Usa la clave
// secreta de Supabase porque recorre las coincidencias de todos; por eso solo funciona con las
// dos claves configuradas en Vercel y nunca desde el navegador. Sin ellas, no hace nada.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return new Response("No autorizado.", { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!url || !secretKey || !publicKey || !privateKey || !subject) {
    return Response.json({ sent: 0, skipped: "Faltan variables de entorno." });
  }

  const supabase = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("take_chat_reminders");
  if (error) return Response.json({ sent: 0, error: "No se pudieron leer los recordatorios." }, { status: 500 });

  const rows = (data ?? []) as { other_id: string; endpoint: string; p256dh: string; auth: string }[];
  let sent = 0;
  await Promise.all(
    rows.map(async (r) => {
      try {
        await webpush.sendNotification(
          { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
          JSON.stringify(pushPayload("reminder", r.other_id)),
          { vapidDetails: { subject, publicKey, privateKey }, TTL: 60 * 60 * 12 },
        );
        sent++;
      } catch (e) {
        // 404 o 410: ese móvil ya no acepta avisos; se borra la dirección.
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", r.endpoint);
        }
      }
    }),
  );
  return Response.json({ sent });
}
