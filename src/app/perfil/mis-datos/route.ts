import { getUser } from "@/lib/supabase/server";

// Descargar mis datos (D-42): un archivo JSON con todo lo que la app guarda de la persona
// (derecho de acceso y portabilidad del RGPD). Lo arma la base con export_my_data().
export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return new Response("Hace falta iniciar sesión.", { status: 401 });

  const { data, error } = await supabase.rpc("export_my_data");
  if (error || !data) return new Response("No pudimos preparar tus datos. Inténtalo de nuevo.", { status: 500 });

  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="zuvi-mis-datos-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
