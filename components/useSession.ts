"use client";

import { useCallback, useEffect, useState } from "react";
import type { BaseCard } from "@/types/cards";

export type CollectionItem = {
  baseCardId: string;
  quantity: number;
  card: BaseCard;
};

export type MeResponse = {
  user: { id: string; username: string; points: number; packsOpened: number };
  collection: CollectionItem[];
  openingsCount: number;
  pveRunsCount: number;
};

export function useSession() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/me", { cache: "no-store" });
    if (!res.ok) {
      setMe(null);
      return false;
    }
    const payload = (await res.json()) as MeResponse;
    setMe(payload);
    return true;
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  return { me, setMe, loading, refresh };
}
