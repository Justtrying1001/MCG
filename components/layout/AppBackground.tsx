"use client";

import { usePathname } from "next/navigation";

const ADMIN_ROUTE_PREFIX = "/admin";

export function AppBackground() {
  const pathname = usePathname();

  if (pathname.startsWith(ADMIN_ROUTE_PREFIX)) {
    return null;
  }

  return (
    <div aria-hidden="true" className="app-background-layer">
      <div className="app-background-gradient" />
      <div className="app-background-blob app-background-blob-primary" />
      <div className="app-background-blob app-background-blob-secondary" />
      <div className="app-background-blob app-background-blob-accent" />
      <div className="app-background-ring app-background-ring-top" />
      <div className="app-background-ring app-background-ring-bottom" />
      <div className="app-background-noise" />
    </div>
  );
}
