import { AdminActionStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ROLES, requireAdminRole, safeLogAdminAction } from "@/lib/admin-ops";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

function isResetEnabled() {
  return (process.env.ENABLE_USER_RESET ?? "false").trim().toLowerCase() === "true";
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Method not allowed" }, { status: 405 });
}

export async function POST(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  const roleCheck = requireAdminRole(auth, [ADMIN_ROLES.ADMIN_SUPERVISOR]);
  if (!roleCheck.ok) {
    return NextResponse.json({ ok: false, error: roleCheck.error }, { status: roleCheck.status });
  }

  if (!isResetEnabled()) {
    return NextResponse.json({ ok: false, error: "User reset is disabled" }, { status: 403 });
  }

  try {
    const summary = await prisma.$transaction(async (tx) => {
      const invites = await tx.userInvite.deleteMany();
      const users = await tx.user.deleteMany();
      const rewardPackSupply = await tx.rewardPackSupply.updateMany({ data: { distributed: 0 } });

      return {
        deletedInvites: invites.count,
        deletedUsers: users.count,
        resetRewardPackSupplyRows: rewardPackSupply.count,
      };
    });

    await safeLogAdminAction({
      actionType: "RESET_USERS",
      module: "admin.resetUsers",
      status: AdminActionStatus.EXECUTED,
      actor: roleCheck.actor,
      targetType: "USER",
      targetId: "*",
      requestSummary: { scope: "all_users" },
      effectSummary: summary,
    });

    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    await safeLogAdminAction({
      actionType: "RESET_USERS",
      module: "admin.resetUsers",
      status: AdminActionStatus.FAILED,
      actor: roleCheck.actor,
      targetType: "USER",
      targetId: "*",
      errorCode: "USER_RESET_FAILED",
      errorMessage: error instanceof Error ? error.message : String(error),
      requestSummary: { scope: "all_users" },
    });

    return NextResponse.json({ ok: false, error: "Unable to reset user data" }, { status: 500 });
  }
}
