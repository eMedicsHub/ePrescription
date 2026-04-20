-- AlterTable
ALTER TABLE "Patient" ALTER COLUMN "universalId" SET DEFAULT ('EPID' || nextval('patient_universal_id_seq'));
