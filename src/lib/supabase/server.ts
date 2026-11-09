import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

// Cliente de Supabase para el servidor (componentes de servidor y acciones). Uno por pedido.
export async function createClient() {
  const { url, key } = supabaseConfig();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Desde un componente de servidor no se pueden escribir cookies; las renueva src/proxy.ts.
        }
      },
    },
  });
}

// Usuario con sesión iniciada, verificado contra Supabase (no solo leyendo la cookie).
export async function getUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}
