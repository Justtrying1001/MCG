"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

type ContestMeta = {
  title: string;
  code: string;
  status: string;
};

const NAV_ITEMS = [
  { href: "", label: "Overview" },
  { href: "/lifecycle", label: "Lifecycle" },
  { href: "/scoring", label: "Scoring" },
  { href: "/settlement", label: "Settlement" },
  { href: "/operator", label: "Operator" },
  { href: "/audit", label: "Audit" },
];

export function useContestWorkbenchMeta(contestId: string) {
  const [meta, setMeta] = useState<ContestMeta | null>(null);

  useEffect(() => {
    let mounted = true;
    void fetch(`/api/internal/contests/${contestId}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!mounted) return;
        const contest = payload?.contest;
        if (!contest) return;
        setMeta({
          title: contest.title ?? "Contest",
          code: contest.code ?? "—",
          status: contest.status ?? "DRAFT",
        });
      });

    return () => {
      mounted = false;
    };
  }, [contestId]);

  return meta;
}

export function ContestWorkbenchShell({
  contestId,
  section,
  description,
  meta,
  actions,
  children,
}: {
  contestId: string;
  section: string;
  description: string;
  meta: ContestMeta | null;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const baseHref = `/admin/contests/${contestId}`;

  return (
    <div className="admin-v2-page contest-workbench-page">
      <section className="contest-admin-overview-back">
        <Link href={baseHref} className="admin-v2-link-chip">← Back to contest overview</Link>
      </section>

      <section className="admin-v2-panel contest-workbench-hero">
        <div>
          <p className="contest-admin-code">{meta?.code ?? "Loading…"}</p>
          <h1 className="contest-admin-title">{meta?.title ?? "Contest"}</h1>
          <p className="contest-admin-muted">{description}</p>
        </div>
        <div className="contest-admin-hero-actions">
          <span className="contest-workbench-context-chip">{section}</span>
          <span className={`contest-admin-status is-${(meta?.status ?? "DRAFT").toLowerCase()}`}>{meta?.status ?? "DRAFT"}</span>
          {actions}
        </div>
      </section>

      <section className="admin-v2-panel contest-workbench-nav">
        {NAV_ITEMS.map((item) => {
          const href = `${baseHref}${item.href}`;
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`admin-v2-link-chip ${active ? "contest-workbench-nav-active" : ""}`}>
              {item.label}
            </Link>
          );
        })}
      </section>

      {children}
    </div>
  );
}
