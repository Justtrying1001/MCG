"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/useSession";
import { trackInternalEvent } from "@/lib/analytics/track";
import { getOrCreateVisitorId } from "@/lib/analytics/visitor-id";

export function InternalAnalyticsTracker() {
  const pathname = usePathname();
  const { loading } = useSession();
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    getOrCreateVisitorId();
  }, []);

  useEffect(() => {
    if (loading || !pathname || lastTrackedRef.current === pathname) return;
    lastTrackedRef.current = pathname;
    trackInternalEvent("PAGE_VIEW");
  }, [loading, pathname]);

  return null;
}
