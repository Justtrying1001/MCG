export function drawWeightForTemplate(input: {
  remainingSupply: number;
  oddsWeight: number;
}) {
  if (input.remainingSupply <= 0) return 0;

  const normalizedOddsWeight = Number.isFinite(input.oddsWeight) && input.oddsWeight > 0
    ? input.oddsWeight
    : 1;

  return input.remainingSupply * normalizedOddsWeight;
}
