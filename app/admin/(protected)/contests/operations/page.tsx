"use client";

import Link from "next/link";

import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminUi";

export default function ContestOperationsHubPage() {
  return (
    <div className="admin-v2-page">
      <AdminPageHeader
        title="Contest Operations"
        subtitle="Secondary technical area for lifecycle diagnostics, scoring, settlement and force actions."
        actions={<Link href="/admin/contests" className="admin-v2-link-chip">Back to Contest Library</Link>}
      />

      <AdminPanel>
        <h3>Access operations per contest</h3>
        <p className="contest-inline-note">Open a contest from Contest Library and use the Operations button to access operator view and lifecycle tools.</p>
        <div className="admin-v2-action-row">
          <Link href="/admin/contests/legacy" className="admin-v2-link-chip">Open legacy global console</Link>
        </div>
      </AdminPanel>
    </div>
  );
}
