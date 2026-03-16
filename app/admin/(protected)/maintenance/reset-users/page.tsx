import React from "react";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import { ResetUsersPanel } from "@/components/admin/ResetUsersPanel";
import { getAdminSessionFromCookies } from "@/lib/admin-auth";
import { ADMIN_ROLES, describeUserResetFlagState, isRootAdminUsername, resolveSessionAdminRole } from "@/lib/admin-ops";

export default function AdminResetUsersPage() {
  const session = getAdminSessionFromCookies();
  const role = resolveSessionAdminRole(session?.username ?? null);
  const isSupervisor = Boolean(session) && role === ADMIN_ROLES.ADMIN_SUPERVISOR;
  const resetFlag = describeUserResetFlagState();

  return (
    <div className="admin-page admin-v2-page">
      <AdminPageHeader
        title="Maintenance / Reset Users"
        subtitle="Irreversible operation that wipes user-owned data and resets pack distribution counters while keeping system catalog entities intact."
      />
      <ResetUsersPanel
        enabled={isSupervisor && resetFlag.enabled}
        isSupervisor={isSupervisor}
        resetEnabled={resetFlag.enabled}
        resetFlagValue={resetFlag.displayValue}
        role={role}
        isRootAdmin={isRootAdminUsername(session?.username ?? null)}
      />
    </div>
  );
}
