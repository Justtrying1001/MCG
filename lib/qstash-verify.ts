import { Receiver } from "@upstash/qstash";

/**
 * Verifies the Upstash QStash signature on an incoming request.
 *
 * If the QStash signing keys are not configured (local dev / staging without
 * QStash), the check is skipped and the function returns `true` with a warning.
 * This prevents contests from getting stuck because a missing env var makes
 * every job return 401.
 */
export async function verifyQStashSignature(
  signature: string,
  body: string,
): Promise<boolean> {
  const current = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const next = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!current || !next) {
    console.warn(
      "[qstash-verify] QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY not set — skipping signature verification (non-production mode)",
    );
    return true;
  }

  const receiver = new Receiver({ currentSigningKey: current, nextSigningKey: next });
  return receiver.verify({ signature, body });
}
