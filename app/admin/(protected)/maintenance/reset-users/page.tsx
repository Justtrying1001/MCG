import { AdminPageHeader } from "@/components/admin/AdminUi";
import { ResetUsersPanel } from "@/components/admin/ResetUsersPanel";
import { getAdminSessionFromCookies } from "@/lib/admin-auth";
import { ADMIN_ROLES, resolveSessionAdminRole } from "@/lib/admin-ops";

export default function AdminResetUsersPage() {
  const session = getAdminSessionFromCookies();
  const role = resolveSessionAdminRole(session?.username ?? null);
  const isSupervisor = Boolean(session) && role === ADMIN_ROLES.ADMIN_SUPERVISOR;

  return (
    <div className="admin-page admin-v2-page">
      <AdminPageHeader
        title="Maintenance / Reset Users"
        subtitle="Irreversible operation that wipes user-owned data while keeping system catalog entities intact."
      />
      <ResetUsersPanel enabled={isSupervisor} />
    </div>
  );
}
