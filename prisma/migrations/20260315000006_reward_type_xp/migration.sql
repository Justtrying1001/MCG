-- Fix 12 (prerequisite): Add XP to RewardType enum
-- XP reward grants are created during settlement execution but the enum value was missing.

ALTER TYPE "RewardType" ADD VALUE IF NOT EXISTS 'XP';
