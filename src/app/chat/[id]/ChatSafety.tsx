"use client";

import { useRouter } from "next/navigation";
import { SafetyMenu } from "@/components/safety/SafetyMenu";

// Tras bloquear o denunciar, el chat ya no existe: vuelve a la lista.
export function ChatSafety({ targetId, name }: { targetId: string; name: string }) {
  const router = useRouter();
  return (
    <SafetyMenu
      targetId={targetId}
      name={name}
      canUnmatch
      className="ml-auto text-zinc-500"
      onDone={() => {
        router.replace("/coincidencias");
        router.refresh();
      }}
    />
  );
}
