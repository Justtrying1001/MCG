"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "@/components/useSession";
import { trackInternalEvent } from "@/lib/analytics/track";

export function InternalAnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { loading } = useSession();
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    const query = searchParams.toString();
    const key = query ? `${pathname}?${query}` : pathname;
    if (!key || lastTrackedRef.current === key) return;
    lastTrackedRef.current = key;
    trackInternalEvent("PAGE_VIEW");
  }, [loading, pathname, searchParams]);

  return null;
}
