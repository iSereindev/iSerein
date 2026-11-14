"use client";
import { useEffect, useState } from "react";
import { getReadIds, READ_EVENT, READ_KEY } from "@/lib/reading-history";

export default function useReadHistory() {
  const [ids, setIds] = useState<number[] | null>(null);
  useEffect(() => {
    const sync = () => setIds(getReadIds());
    const storage = (event: StorageEvent) => { if (!event.key || event.key === READ_KEY) sync(); };
    sync();
    window.addEventListener(READ_EVENT, sync);
    window.addEventListener("storage", storage);
    return () => { window.removeEventListener(READ_EVENT, sync); window.removeEventListener("storage", storage); };
  }, []);
  return ids;
}
