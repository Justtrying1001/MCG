import { ADMIN_ROLES, type AdminRole } from "@/lib/admin-ops";

const ENABLE_USER_RESET_ENV = "ENABLE_USER_RESET";

function parseBooleanEnv(value: string | undefined) {
  return (value ?? "").trim().toLowerCase() === "true";
}

export function isUserResetFeatureEnabled() {
  return parseBooleanEnv(process.env.ENABLE_USER_RESET);
}

export function getUserResetFeatureDisabledReason() {
  const raw = process.env.ENABLE_USER_RESET;
  if (parseBooleanEnv(raw)) {
    return null;
  }

  const normalized = (raw ?? "").trim();
  const rendered = normalized ? `'${normalized}'` : "not set";
  return `User reset is disabled because ${ENABLE_USER_RESET_ENV} must be 'true' (current value: ${rendered}).`;
}

export function getUserResetAvailability(role: AdminRole | null | undefined, hasSession: boolean) {
  if (!hasSession || role !== ADMIN_ROLES.ADMIN_SUPERVISOR) {
    return {
      enabled: false,
      reasonCode: "insufficient_role" as const,
      reason: "User reset requires an ADMIN_SUPERVISOR session.",
    };
  }

  const envReason = getUserResetFeatureDisabledReason();
  if (envReason) {
    return {
      enabled: false,
      reasonCode: "feature_flag_disabled" as const,
      reason: envReason,
    };
  }

  return {
    enabled: true,
    reasonCode: null,
    reason: null,
  };
}
