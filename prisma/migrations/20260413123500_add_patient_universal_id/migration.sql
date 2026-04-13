-- CreateSequence
CREATE SEQUENCE IF NOT EXISTS "patient_universal_id_seq"
    START WITH 147896
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN "universalId" TEXT;

-- Backfill existing rows with generated universal IDs.
UPDATE "Patient"
SET "universalId" = ('EPID' || nextval('patient_universal_id_seq'))
WHERE "universalId" IS NULL;

-- AlterTable
ALTER TABLE "Patient"
ALTER COLUMN "universalId" SET DEFAULT ('EPID' || nextval('patient_universal_id_seq')),
ALTER COLUMN "universalId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Patient_universalId_key" ON "Patient"("universalId");