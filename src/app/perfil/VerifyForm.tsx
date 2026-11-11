"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { validatePhoto } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import { VERIFICATION_BUCKET } from "@/lib/supabase/config";
import { requestVerification } from "./actions";

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function VerifyForm({ userId, gesture }: { userId: string; gesture: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(file: File) {
    const problem = validatePhoto(file);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const path = `${userId}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
    const upload = await supabase.storage.from(VERIFICATION_BUCKET).upload(path, file, { contentType: file.type });
    const ok = !upload.error && (await requestVerification(path, gesture)).ok;
    if (!ok && !upload.error) await supabase.storage.from(VERIFICATION_BUCKET).remove([path]);
    setBusy(false);
    if (!ok) return setError("No pudimos enviar el selfie. Inténtalo de nuevo.");
    router.refresh();
  }

  return (
    <>
      <label
        className={`w-fit cursor-pointer rounded-full bg-sky-600 px-5 py-2 font-semibold text-white ${
          busy ? "opacity-50" : ""
        }`}
      >
        {busy ? "Enviando…" : "Hacer el selfie"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="user"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) send(file);
          }}
        />
      </label>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </>
  );
}
