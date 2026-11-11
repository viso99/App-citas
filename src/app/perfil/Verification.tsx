import { GESTURES } from "@/lib/profileExtras";
import { getUser } from "@/lib/supabase/server";
import { VerifyForm } from "./VerifyForm";

type Row = { submitted_at: string; verified_at: string | null; rejected_at: string | null };

// Perfil verificado (D-23): estado y, si hace falta, el formulario para enviar el selfie.
export async function Verification() {
  const { supabase, user } = await getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("verifications")
    .select("submitted_at, verified_at, rejected_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return null;
  const row = data as Row | null;

  const box = "flex flex-col gap-2 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800";
  if (row?.verified_at) {
    return (
      <section className={box}>
        <span className="font-medium text-sky-600">✔ Perfil verificado</span>
        <span className="text-sm text-zinc-500">Los demás ven la insignia en tu tarjeta.</span>
      </section>
    );
  }
  if (row && !row.rejected_at) {
    return (
      <section className={box}>
        <span className="font-medium">Verificación en revisión</span>
        <span className="text-sm text-zinc-500">Hemos recibido tu selfie. Te avisaremos aquí cuando lo revisemos.</span>
      </section>
    );
  }

  const keys = Object.keys(GESTURES) as (keyof typeof GESTURES)[];
  // Un gesto que depende de la persona (y cambia si ya envió uno), para que no sirva una foto cualquiera.
  const seed = [...user.id, ...(row?.submitted_at ?? "")].reduce((n, c) => n + c.charCodeAt(0), 0);
  const gesture = keys[seed % keys.length];
  return (
    <section className={box}>
      <span className="font-medium">Verifica tu perfil</span>
      {row?.rejected_at && (
        <span className="text-sm text-red-600">No pudimos verificar el selfie anterior. Prueba otra vez.</span>
      )}
      <span className="text-sm text-zinc-600 dark:text-zinc-300">
        Hazte un selfie <strong>{GESTURES[gesture]}</strong>, con la cara bien visible. Lo revisamos a mano y
        solo lo vemos nosotros. Si coincide con tus fotos, tu tarjeta llevará la insignia ✔.
      </span>
      <VerifyForm userId={user.id} gesture={gesture} />
    </section>
  );
}
