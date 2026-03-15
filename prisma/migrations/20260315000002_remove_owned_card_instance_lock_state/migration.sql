-- Fix 3: Remove OwnedCardInstance.lockState
-- This field was a derived cache of RosterLock state. It was never cleared
-- after settlement or cancellation, leaving cards permanently "locked"
-- from the user's perspective. Conflict detection uses RosterLock only.

ALTER TABLE "OwnedCardInstance" DROP COLUMN IF EXISTS "lockState";
