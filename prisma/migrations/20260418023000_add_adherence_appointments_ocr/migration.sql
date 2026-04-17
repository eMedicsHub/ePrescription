DO $$ BEGIN
  CREATE TYPE "MedicationScheduleStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "MedicationAdherenceStatus" AS ENUM ('PENDING', 'TAKEN', 'MISSED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "AppointmentType" AS ENUM ('CONSULTATION', 'LAB', 'IMAGING', 'PROCEDURE', 'FOLLOW_UP', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ReminderChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "OcrJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "MedicationSchedule" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "prescriptionId" TEXT,
  "medicationId" TEXT,
  "medicationName" TEXT NOT NULL,
  "dosage" TEXT,
  "instruction" TEXT,
  "frequency" TEXT NOT NULL,
  "timesPerDay" INTEGER NOT NULL DEFAULT 1,
  "reminderTimes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "status" "MedicationScheduleStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "MedicationSchedule_patientId_status_startDate_idx" ON "MedicationSchedule" ("patientId", "status", "startDate");
CREATE INDEX IF NOT EXISTS "MedicationSchedule_prescriptionId_idx" ON "MedicationSchedule" ("prescriptionId");
DO $$ BEGIN ALTER TABLE "MedicationSchedule" ADD CONSTRAINT "MedicationSchedule_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MedicationSchedule" ADD CONSTRAINT "MedicationSchedule_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MedicationSchedule" ADD CONSTRAINT "MedicationSchedule_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "MedicationAdherenceLog" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "scheduleId" TEXT NOT NULL,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "takenAt" TIMESTAMP(3),
  "status" "MedicationAdherenceStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "source" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "MedicationAdherenceLog_patientId_scheduledFor_idx" ON "MedicationAdherenceLog" ("patientId", "scheduledFor");
CREATE INDEX IF NOT EXISTS "MedicationAdherenceLog_scheduleId_scheduledFor_idx" ON "MedicationAdherenceLog" ("scheduleId", "scheduledFor");
DO $$ BEGIN ALTER TABLE "MedicationAdherenceLog" ADD CONSTRAINT "MedicationAdherenceLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MedicationAdherenceLog" ADD CONSTRAINT "MedicationAdherenceLog_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "MedicationSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Appointment" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "doctorUserId" TEXT,
  "title" TEXT NOT NULL,
  "type" "AppointmentType" NOT NULL DEFAULT 'CONSULTATION',
  "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
  "appointmentAt" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER,
  "location" TEXT,
  "visitNotes" TEXT,
  "followUpDate" TIMESTAMP(3),
  "reminderOffsetMins" INTEGER[] NOT NULL DEFAULT ARRAY[1440,120]::INTEGER[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Appointment_patientId_appointmentAt_idx" ON "Appointment" ("patientId", "appointmentAt");
CREATE INDEX IF NOT EXISTS "Appointment_doctorUserId_appointmentAt_idx" ON "Appointment" ("doctorUserId", "appointmentAt");
DO $$ BEGIN ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorUserId_fkey" FOREIGN KEY ("doctorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AppointmentReminder" (
  "id" TEXT PRIMARY KEY,
  "appointmentId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "reminderAt" TIMESTAMP(3) NOT NULL,
  "channel" "ReminderChannel" NOT NULL DEFAULT 'IN_APP',
  "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AppointmentReminder_patientId_reminderAt_status_idx" ON "AppointmentReminder" ("patientId", "reminderAt", "status");
CREATE INDEX IF NOT EXISTS "AppointmentReminder_appointmentId_reminderAt_idx" ON "AppointmentReminder" ("appointmentId", "reminderAt");
DO $$ BEGIN ALTER TABLE "AppointmentReminder" ADD CONSTRAINT "AppointmentReminder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AppointmentReminder" ADD CONSTRAINT "AppointmentReminder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "OcrImportJob" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "sourceRecordId" TEXT,
  "filename" TEXT NOT NULL,
  "mimeType" TEXT,
  "status" "OcrJobStatus" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT,
  "extractedText" TEXT,
  "extractedPayload" JSONB,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "OcrImportJob_patientId_createdAt_idx" ON "OcrImportJob" ("patientId", "createdAt");
CREATE INDEX IF NOT EXISTS "OcrImportJob_status_updatedAt_idx" ON "OcrImportJob" ("status", "updatedAt");
DO $$ BEGIN ALTER TABLE "OcrImportJob" ADD CONSTRAINT "OcrImportJob_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OcrImportJob" ADD CONSTRAINT "OcrImportJob_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "PatientRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
