"use client";

import { useRouter } from "next/navigation";
import { LocationSetter } from "@/components/LocationSetter";

export function NeedsLocation() {
  const router = useRouter();
  return <LocationSetter onSaved={() => router.refresh()} />;
}
