import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";

// Cliente de Supabase para componentes del navegador ("use client").
export function createClient() {
  const { url, key } = supabaseConfig();
  return createBrowserClient(url, key);
}
