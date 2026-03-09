import type { BaseCard } from "@/types/cards";

/**
 * Phase 0 contract boundary:
 * - Keep legacy top-level fields stable for current UI.
 * - Reserve `coexistence` for phased migration extensions.
 *
 * Later phases can add projection/domain slices under `coexistence`
 * without turning this endpoint into an unstructured payload.
 */
export type MeCoexistenceEnvelope = {
  coexistence?: {
    /**
     * Additive migration payload bucket (Phase 1+).
     * Keep undefined in Phase 0 to preserve wire compatibility.
     */
    v2?: Record<string, unknown>;
  };
};

export type CollectionItem = {
  baseCardId: string;
  quantity: number;
  pveExhausted: boolean;
  card: BaseCard;
};

export type UserSessionPayload = MeCoexistenceEnvelope & {
  mode: "user";
  user: {
    id: string;
    xUserId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    authProvider: string;
    points: number;
    packsOpened: number;
    pveBattleTickets: number;
    lastPveResetAt: string;
  };
  collection: CollectionItem[];
  openingsCount: number;
  pveRunsCount: number;
  availablePveCards: number;
  exhaustedPveCards: number;
  nextPveResetAt: string;
};

export type GuestSessionPayload = {
  mode: "guest";
  user: {
    id: "guest";
    xUserId: null;
    username: "Guest";
    displayName: "Guest";
    avatarUrl: null;
    authProvider: "guest";
    points: number;
    packsOpened: number;
    pveBattleTickets: number;
    lastPveResetAt: string;
  };
  collection: CollectionItem[];
  openingsCount: number;
  pveRunsCount: number;
  availablePveCards: number;
  exhaustedPveCards: number;
  nextPveResetAt: string;
};

export type SessionState = UserSessionPayload | GuestSessionPayload;
