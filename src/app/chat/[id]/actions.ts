"use server";

import { isUuid } from "@/lib/chat";
import { sendPush } from "@/lib/supabase/sendPush";
import { getUser } from "@/lib/supabase/server";

// Avisa en el móvil a la otra persona de que tiene un mensaje nuevo (D-24). La base solo da
// sus direcciones si acabo de escribirle.
export async function notifyMessage(otherId: string): Promise<void> {
  if (!isUuid(otherId)) return;
  const { supabase, user } = await getUser();
  if (!user) return;
  await sendPush(supabase, otherId, "message");
}
