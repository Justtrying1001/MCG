import { AdminPageHeader } from "@/components/admin/AdminUi";
import { ResetUsersPanel } from "@/components/admin/ResetUsersPanel";
import { getAdminSessionFromCookies } from "@/lib/admin-auth";
import { resolveSessionAdminRole } from "@/lib/admin-ops";
import { getUserResetAvailability } from "@/lib/admin-reset-users";

export default function AdminResetUsersPage() {
  const session = getAdminSessionFromCookies();
  const role = resolveSessionAdminRole(session?.username ?? null);
  const availability = getUserResetAvailability(role, Boolean(session));

  return (
    <div className="admin-page admin-v2-page">
      <AdminPageHeader
        title="Maintenance / Reset Users"
        subtitle="Irreversible operation that wipes user-owned data while keeping system catalog entities intact."
      />
      <ResetUsersPanel availability={availability} />
    </div>
  );
}
