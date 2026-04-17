-- Idempotent patient-foundation migration for drifted environments.
-- This keeps existing data and adds patient-centric medical-history tables.

DO $$ BEGIN
  CREATE TYPE "PatientAllergyCategory" AS ENUM ('DRUG', 'FOOD', 'ENVIRONMENT', 'INSECT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PatientSeverityLevel" AS ENUM ('MILD', 'MODERATE', 'SEVERE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PatientConditionStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'IN_REMISSION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PatientFamilyConditionStatus" AS ENUM ('PRESENT', 'SUSPECTED', 'NEGATIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PatientCarePlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "bloodType" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "emergencyNotes" TEXT;

CREATE TABLE IF NOT EXISTS "PatientVital" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "heightCm" DOUBLE PRECISION,
  "weightKg" DOUBLE PRECISION,
  "temperatureC" DOUBLE PRECISION,
  "systolicBp" INTEGER,
  "diastolicBp" INTEGER,
  "pulseBpm" INTEGER,
  "spo2Percent" INTEGER,
  "glucoseMgDl" DOUBLE PRECISION,
  "bmi" DOUBLE PRECISION,
  "notes" TEXT,
  "sourceRecordId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PatientVital_patientId_recordedAt_idx" ON "PatientVital" ("patientId", "recordedAt");
DO $$ BEGIN
  ALTER TABLE "PatientVital" ADD CONSTRAINT "PatientVital_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PatientAllergy" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "allergen" TEXT NOT NULL,
  "category" "PatientAllergyCategory" NOT NULL DEFAULT 'OTHER',
  "severity" "PatientSeverityLevel",
  "reaction" TEXT,
  "firstObservedAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PatientAllergy_patientId_isActive_idx" ON "PatientAllergy" ("patientId", "isActive");
CREATE INDEX IF NOT EXISTS "PatientAllergy_patientId_allergen_idx" ON "PatientAllergy" ("patientId", "allergen");
DO $$ BEGIN
  ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PatientCondition" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "icd10Code" TEXT,
  "status" "PatientConditionStatus" NOT NULL DEFAULT 'ACTIVE',
  "diagnosedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "primaryProvider" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PatientCondition_patientId_status_idx" ON "PatientCondition" ("patientId", "status");
CREATE INDEX IF NOT EXISTS "PatientCondition_patientId_name_idx" ON "PatientCondition" ("patientId", "name");
DO $$ BEGIN
  ALTER TABLE "PatientCondition" ADD CONSTRAINT "PatientCondition_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PatientImmunization" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "vaccine" TEXT NOT NULL,
  "doseNumber" TEXT,
  "administeredAt" TIMESTAMP(3),
  "administeredBy" TEXT,
  "facility" TEXT,
  "lotNumber" TEXT,
  "nextDueAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PatientImmunization_patientId_administeredAt_idx" ON "PatientImmunization" ("patientId", "administeredAt");
DO $$ BEGIN
  ALTER TABLE "PatientImmunization" ADD CONSTRAINT "PatientImmunization_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PatientSurgery" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "procedureName" TEXT NOT NULL,
  "surgeryDate" TIMESTAMP(3),
  "hospital" TEXT,
  "surgeon" TEXT,
  "outcome" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PatientSurgery_patientId_surgeryDate_idx" ON "PatientSurgery" ("patientId", "surgeryDate");
DO $$ BEGIN
  ALTER TABLE "PatientSurgery" ADD CONSTRAINT "PatientSurgery_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PatientFamilyHistory" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "relation" TEXT NOT NULL,
  "condition" TEXT NOT NULL,
  "status" "PatientFamilyConditionStatus" NOT NULL DEFAULT 'PRESENT',
  "diagnosedAge" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PatientFamilyHistory_patientId_relation_idx" ON "PatientFamilyHistory" ("patientId", "relation");
DO $$ BEGIN
  ALTER TABLE "PatientFamilyHistory" ADD CONSTRAINT "PatientFamilyHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PatientEmergencyContact" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "relationship" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "address" TEXT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PatientEmergencyContact_patientId_isPrimary_idx" ON "PatientEmergencyContact" ("patientId", "isPrimary");
DO $$ BEGIN
  ALTER TABLE "PatientEmergencyContact" ADD CONSTRAINT "PatientEmergencyContact_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PatientLifestyleProfile" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL UNIQUE,
  "smokingStatus" TEXT,
  "alcoholUse" TEXT,
  "activityLevel" TEXT,
  "dietPreference" TEXT,
  "sleepHours" DOUBLE PRECISION,
  "stressLevel" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DO $$ BEGIN
  ALTER TABLE "PatientLifestyleProfile" ADD CONSTRAINT "PatientLifestyleProfile_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PatientInsurancePolicy" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "planName" TEXT,
  "memberId" TEXT,
  "policyNumber" TEXT,
  "groupNumber" TEXT,
  "validFrom" TIMESTAMP(3),
  "validTo" TIMESTAMP(3),
  "isPrimary" BOOLEAN NOT NULL DEFAULT FALSE,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PatientInsurancePolicy_patientId_isPrimary_idx" ON "PatientInsurancePolicy" ("patientId", "isPrimary");
DO $$ BEGIN
  ALTER TABLE "PatientInsurancePolicy" ADD CONSTRAINT "PatientInsurancePolicy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PatientCarePlan" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "goal" TEXT,
  "status" "PatientCarePlanStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP(3),
  "targetReviewAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PatientCarePlan_patientId_status_idx" ON "PatientCarePlan" ("patientId", "status");
DO $$ BEGIN
  ALTER TABLE "PatientCarePlan" ADD CONSTRAINT "PatientCarePlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
