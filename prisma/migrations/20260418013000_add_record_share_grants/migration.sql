DO $$ BEGIN
  CREATE TYPE "RecordShareScope" AS ENUM ('FULL_HISTORY', 'CATEGORY_FILTER', 'SELECTED_RECORDS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RecordShareStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PatientRecordShareGrant" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "doctorUserId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "scope" "RecordShareScope" NOT NULL DEFAULT 'FULL_HISTORY',
  "status" "RecordShareStatus" NOT NULL DEFAULT 'ACTIVE',
  "allowedCategories" "PatientRecordCategory"[] DEFAULT ARRAY[]::"PatientRecordCategory"[],
  "notes" TEXT,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revokedReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  ALTER TABLE "PatientRecordShareGrant"
  ADD CONSTRAINT "PatientRecordShareGrant_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PatientRecordShareGrant"
  ADD CONSTRAINT "PatientRecordShareGrant_doctorUserId_fkey"
  FOREIGN KEY ("doctorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PatientRecordShareGrant"
  ADD CONSTRAINT "PatientRecordShareGrant_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "PatientRecordShareGrant_patientId_status_expiresAt_idx"
ON "PatientRecordShareGrant" ("patientId", "status", "expiresAt");
CREATE INDEX IF NOT EXISTS "PatientRecordShareGrant_doctorUserId_status_expiresAt_idx"
ON "PatientRecordShareGrant" ("doctorUserId", "status", "expiresAt");

CREATE TABLE IF NOT EXISTS "PatientRecordShareGrantRecord" (
  "id" TEXT PRIMARY KEY,
  "grantId" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  ALTER TABLE "PatientRecordShareGrantRecord"
  ADD CONSTRAINT "PatientRecordShareGrantRecord_grantId_fkey"
  FOREIGN KEY ("grantId") REFERENCES "PatientRecordShareGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PatientRecordShareGrantRecord"
  ADD CONSTRAINT "PatientRecordShareGrantRecord_recordId_fkey"
  FOREIGN KEY ("recordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "PatientRecordShareGrantRecord_grantId_recordId_key"
ON "PatientRecordShareGrantRecord" ("grantId", "recordId");
CREATE INDEX IF NOT EXISTS "PatientRecordShareGrantRecord_recordId_idx"
ON "PatientRecordShareGrantRecord" ("recordId");
