export type CompensationValidationIssue = {
  severity?: "ERROR" | "WARN" | string;
  message?: string;
};

export type CompensationValidationResult = {
  blocking?: boolean;
  issues?: CompensationValidationIssue[];
  validationToken?: string;
  error?: string;
};

export function listBlockingCompensationIssues(result: CompensationValidationResult | null | undefined) {
  return (result?.issues ?? [])
    .filter((issue) => issue.severity === "ERROR" && typeof issue.message === "string" && issue.message.trim().length > 0)
    .map((issue) => issue.message!.trim());
}

export function isCompensationValidationBlocked(result: CompensationValidationResult | null | undefined) {
  if (!result) return false;
  if (result.blocking) return true;
  return listBlockingCompensationIssues(result).length > 0;
}


export function buildCompensationValidatePayload(input: {
  userId: string;
  amount: number;
  reasonLabel: string;
  reasonCode: string;
}) {
  return {
    userId: input.userId.trim(),
    amount: input.amount,
    reasonLabel: input.reasonLabel.trim(),
    reasonCode: input.reasonCode.trim(),
  };
}
