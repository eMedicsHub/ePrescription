ALTER TABLE "PatientRecord"
ADD COLUMN "reportDate" TIMESTAMP(3),
ADD COLUMN "reports" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "PatientRecord"
SET "reports" = ARRAY[]::TEXT[]
WHERE "reports" IS NULL;

ALTER TABLE "PatientRecord"
ALTER COLUMN "reports" SET NOT NULL;
