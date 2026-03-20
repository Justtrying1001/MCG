"use client";

import { track } from "@vercel/analytics/react";

type EventProperties = Record<string, string | number | boolean | null | undefined>;

export type InternalTrackableEventType = "PAGE_VIEW" | "CLICK_OPEN_PACK" | "LOGIN" | "PACK_OPEN";

export function trackEvent(name: string, properties?: EventProperties) {
  try {
    track(name, properties);
  } catch {
    // Analytics must never block the product flow.
  }
}

export function trackInternalEvent(type: InternalTrackableEventType) {
  try {
    void fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
      keepalive: true,
    });
  } catch {
    // Internal analytics must never block the product flow.
  }
}
