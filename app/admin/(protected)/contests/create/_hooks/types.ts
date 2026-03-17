export type CardSet = { id: string; code: string; displayName: string; isActive: boolean };

export type RewardCapacityRow = {
  packDefinitionId: string;
  packCode: string | null;
  required: number;
  available: number;
  shortfall: number;
  verdict: "OK" | "INSUFFICIENT_SUPPLY" | "INVALID_REWARD_CONFIG" | "UNKNOWN_PACK" | "REWARD_POOL_MISSING";
};

export type RewardCapacityCheck = {
  verdict: "OK" | "INSUFFICIENT_SUPPLY" | "INVALID_REWARD_CONFIG" | "UNKNOWN_PACK" | "REWARD_POOL_MISSING";
  isPublishable: boolean;
  rows: RewardCapacityRow[];
};

export type ContestWizardStepId = "identity" | "schedule" | "entry-rules" | "rewards" | "review";

export type ContestWizardStep = {
  id: ContestWizardStepId;
  title: string;
};

export type ContestFormState = {
  code: string;
  title: string;
  description: string;
  coverImageUrl: string;
  openAt: string;
  lockAt: string;
  durationValue: string;
  durationUnit: "HOURS" | "DAYS";
  entryFeeEnabled: boolean;
  entryFeeAmount: string;
  maxRosterSize: string;
  eligibilityMode: "ANY" | "CARD_SET_ONLY";
  cardSetId: string;
  rulesText: string;
  participationNotes: string;
  optionalClarifications: string;
  pointsPoolAmount: string;
  packPoolAmount: string;
  rewardedTopPercent: string;
  distributionProfile: "balanced" | "top-heavy" | "very-top-heavy";
  previewParticipants: string;
};
