-- AlterTable
ALTER TABLE "Patient" ALTER COLUMN "universalId" SET DEFAULT ('EPID' || nextval('patient_universal_id_seq'));

-- CreateTable
CREATE TABLE "PrescriptionTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrescriptionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateMedication" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,

    CONSTRAINT "TemplateMedication_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PrescriptionTemplate" ADD CONSTRAINT "PrescriptionTemplate_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateMedication" ADD CONSTRAINT "TemplateMedication_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PrescriptionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
