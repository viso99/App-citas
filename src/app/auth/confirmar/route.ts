import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Destino del enlace del correo de acceso (D-7). Sin un servicio de correo propio, Supabase
// manda un enlace en vez de un código: el enlace pasa por Supabase y vuelve acá con `code`
// (o con `token_hash` si la plantilla del correo lo usa). Se crea la sesión y se va a Descubrir (que manda al perfil si todavía no existe).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  const target = request.nextUrl.clone();
  target.search = "";
  target.pathname = ok ? "/descubrir" : "/entrar";
  if (!ok) target.searchParams.set("error", "enlace");
  return NextResponse.redirect(target);
}
