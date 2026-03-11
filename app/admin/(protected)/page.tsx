import Link from "next/link";

import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { SiteShell } from "@/components/layout/SiteShell";

export default function AdminHomePage() {
  return (
    <SiteShell>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Internal Admin</h1>
          <p className="page-subtitle">Internal operations entrypoint for contest and quest management tools.</p>
        </div>
        <AdminLogoutButton />
      </div>

      <section className="contest-section">
        <h2 className="contest-section-title">Tools</h2>
        <div className="contest-list">
          <Link href="/admin/contests" className="contest-card">
            <div className="contest-card-top">
              <p className="contest-code">OPS</p>
            </div>
            <h3 className="contest-title">Contest Admin Panel</h3>
            <p className="contest-inline-note">Create contests, change status, inject scores, and settle rewards.</p>
          </Link>

          <Link href="/admin/quests" className="contest-card">
            <div className="contest-card-top">
              <p className="contest-code">QUESTS</p>
            </div>
            <h3 className="contest-title">Quest Definitions</h3>
            <p className="contest-inline-note">Create and manage quest definitions used by rewards progression.</p>
          </Link>

          <Link href="/admin/quests/submissions" className="contest-card">
            <div className="contest-card-top">
              <p className="contest-code">REVIEW</p>
            </div>
            <h3 className="contest-title">Quest Review Queue</h3>
            <p className="contest-inline-note">Approve or reject social quest submissions and trigger point rewards.</p>
          </Link>

          <Link href="/admin/rewards" className="contest-card">
            <div className="contest-card-top">
              <p className="contest-code">REWARDS</p>
            </div>
            <h3 className="contest-title">Manual Reward Grants</h3>
            <p className="contest-inline-note">Grant points manually for support/ops compensation with ledger traceability.</p>
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
