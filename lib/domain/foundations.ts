import type { DomainBoundaryNote } from "@/types/domain/foundations";

export const PHASE_1_BOUNDARY_NOTES: DomainBoundaryNote[] = [
  {
    domain: "catalog",
    phaseTag: "parallel-target",
    note: "Card catalog foundations are additive and not yet wired to legacy card rendering.",
  },
  {
    domain: "ownership",
    phaseTag: "parallel-target",
    note: "OwnedCardInstance is introduced without replacing UserCard write/read paths yet.",
  },
  {
    domain: "acquisition",
    phaseTag: "parallel-target",
    note: "PackDefinition/DropTable/PackOpeningEvent/RewardGrant are foundations only.",
  },
  {
    domain: "contests",
    phaseTag: "parallel-target",
    note: "Contest lifecycle entities are schema-first foundations with no UI/API cutover.",
  },
  {
    domain: "progression",
    phaseTag: "parallel-target",
    note: "Progression models are isolated from legacy points/PvE counters.",
  },
  {
    domain: "projections",
    phaseTag: "projection-foundation",
    note: "Read-model contracts are scaffolding for later collection/profile/contest surfaces.",
  },
];
