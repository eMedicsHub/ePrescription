-- AlterTable
ALTER TABLE "User"
ADD COLUMN "isApproved" BOOLEAN NOT NULL DEFAULT false;

-- Preserve access for existing accounts created before approval gating.
UPDATE "User"
SET "isApproved" = true;