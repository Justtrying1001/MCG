import { z } from "zod";

import { getPackPurchaseLimitConfig, updatePackPurchaseLimitConfig } from "@/lib/domain/acquisition/purchase-limit";

const schema = z.object({
  enabled: z.boolean(),
  maxPurchasesPer24h: z.number().int().min(0).max(1000),
});

export async function getPackPurchaseLimitAdminSummary() {
  const config = await getPackPurchaseLimitConfig();
  return {
    config,
    preview: config.enabled
      ? `Users can buy up to ${config.maxPurchasesPer24h} sale packs in any rolling 24-hour window.`
      : "Purchased-pack limit disabled. Store purchases are currently uncapped.",
    helperText: "Applies only to store purchases of SALE packs. Reward, contest, and admin-granted packs are not counted.",
  };
}

export async function updatePackPurchaseLimitAdminSummary(input: unknown) {
  const parsed = schema.parse(input);
  const config = await updatePackPurchaseLimitConfig(parsed);
  return {
    config,
    preview: config.enabled
      ? `Users can buy up to ${config.maxPurchasesPer24h} sale packs in any rolling 24-hour window.`
      : "Purchased-pack limit disabled. Store purchases are currently uncapped.",
    helperText: "Applies only to store purchases of SALE packs. Reward, contest, and admin-granted packs are not counted.",
  };
}
