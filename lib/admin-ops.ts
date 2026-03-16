import { AdminActionStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const ADMIN_ROLES = {
  ADMIN_OPS: "ADMIN_OPS",
  ADMIN_MODERATOR: "ADMIN_MODERATOR",
  ADMIN_FINANCE_OPS: "ADMIN_FINANCE_OPS",
  ADMIN_SUPERVISOR: "ADMIN_SUPERVISOR",
} as const;

export type AdminRole = typeof ADMIN_ROLES[keyof typeof ADMIN_ROLES];

export type AdminActor = {
  type: "admin_user" | "service_key";
  id: string;
  label: string;
  username: string | null;
  authMode: "session" | "key";
  role: AdminRole;
};

export type AdminAccessContext = {
  ok: true;
  mode: "session" | "key";
  actor: AdminActor;
} | {
  ok: false;
  status: number;
  error: string;
};

export async function logAdminAction(params: {
  actionType: string;
  module: string;
  status: AdminActionStatus;
  actor: AdminActor;
  targetType?: string;
  targetId?: string;
  requestSummary?: Prisma.InputJsonValue;
  effectSummary?: Prisma.InputJsonValue;
  errorCode?: string;
  errorMessage?: string;
}) {
  return prisma.adminActionLog.create({
    data: {
      actionType: params.actionType,
      module: params.module,
      targetType: params.targetType,
      targetId: params.targetId,
      actorType: params.actor.type,
      actorId: params.actor.id,
      actorLabel: params.actor.label,
      authMode: params.actor.authMode,
      status: params.status,
      requestSummary: params.requestSummary,
      effectSummary: params.effectSummary,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
    },
  });
}

export async function safeLogAdminAction(params: Parameters<typeof logAdminAction>[0]) {
  try {
    await logAdminAction(params);
  } catch {
    // best effort logging
  }
}

const ALL_ADMIN_ROLES: AdminRole[] = Object.values(ADMIN_ROLES);

export function parseAdminRole(raw: string | null | undefined): AdminRole {
  const value = (raw ?? "").trim().toUpperCase();
  if (ALL_ADMIN_ROLES.includes(value as AdminRole)) {
    return value as AdminRole;
  }
  return ADMIN_ROLES.ADMIN_OPS;
}

function normalizeUsername(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function getRootAdminUsername() {
  return normalizeUsername(process.env.ROOT_ADMIN_X_USERNAME ?? process.env.OWNER_X_USERNAME);
}

export function isRootAdminUsername(username: string | null | undefined) {
  const normalizedUsername = normalizeUsername(username);
  const rootUsername = getRootAdminUsername();
  return Boolean(normalizedUsername) && Boolean(rootUsername) && normalizedUsername === rootUsername;
}

export function resolveSessionAdminRole(username: string | null | undefined): AdminRole {
  if (isRootAdminUsername(username)) {
    return ADMIN_ROLES.ADMIN_SUPERVISOR;
  }

  return parseAdminRole(process.env.ADMIN_DEFAULT_ROLE ?? "ADMIN_SUPERVISOR");
}

export function hasAnyRole(actor: AdminActor, allowed: AdminRole[]) {
  return allowed.includes(actor.role) || actor.role === ADMIN_ROLES.ADMIN_SUPERVISOR;
}

export function requireAdminRole(access: AdminAccessContext, allowed: AdminRole[]): { ok: true; actor: AdminActor } | { ok: false; status: number; error: string } {
  if (!access.ok) return access;
  if (!hasAnyRole(access.actor, allowed)) {
    return { ok: false, status: 403, error: "Insufficient admin role" };
  }
  return { ok: true, actor: access.actor };
}

export async function createAdminArtifact(params: {
  artifactType: string;
  targetType?: string;
  targetId?: string;
  payload: Prisma.InputJsonValue;
  createdBy: string;
  ttlSeconds?: number;
}) {
  const ttlSeconds = params.ttlSeconds ?? 60 * 30;
  await purgeExpiredAdminArtifacts(200);

  return prisma.adminOpArtifact.create({
    data: {
      artifactType: params.artifactType,
      targetType: params.targetType,
      targetId: params.targetId,
      payload: params.payload,
      createdBy: params.createdBy,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    },
  });
}

export async function getAdminArtifact(id: string, expectedType?: string) {
  const row = await prisma.adminOpArtifact.findUnique({ where: { id } });
  if (!row) return null;
  if (expectedType && row.artifactType !== expectedType) return null;
  if (row.expiresAt <= new Date()) {
    await prisma.adminOpArtifact.delete({ where: { id: row.id } }).catch(() => undefined);
    return null;
  }
  return row;
}

export async function purgeExpiredAdminArtifacts(limit = 1000) {
  const expired = await prisma.adminOpArtifact.findMany({
    where: { expiresAt: { lte: new Date() } },
    select: { id: true },
    take: Math.max(1, Math.min(limit, 5000)),
  });

  if (expired.length === 0) return { deleted: 0 };
  const ids = expired.map((row) => row.id);
  const result = await prisma.adminOpArtifact.deleteMany({ where: { id: { in: ids } } });
  return { deleted: result.count };
}

export async function claimIdempotencyKey(params: {
  idempotencyKey: string;
  actionType: string;
  actorId: string;
  targetType?: string;
  targetId?: string;
}) {
  try {
    const row = await prisma.adminIdempotencyKey.create({
      data: {
        idempotencyKey: params.idempotencyKey,
        actionType: params.actionType,
        actorId: params.actorId,
        targetType: params.targetType,
        targetId: params.targetId,
      },
    });
    return { claimed: true as const, row };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.adminIdempotencyKey.findUnique({ where: { idempotencyKey: params.idempotencyKey } });
      return { claimed: false as const, row: existing };
    }
    throw error;
  }
}
