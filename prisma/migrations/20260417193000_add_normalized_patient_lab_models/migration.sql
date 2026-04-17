CREATE TABLE IF NOT EXISTS "PatientLabPanel" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "panelName" TEXT,
    "reportDate" TIMESTAMP(3),
    "sourcePortal" "PatientRecordSourcePortal" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PatientLabPanel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PatientLabResult" (
    "id" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "testProfile" TEXT,
    "testName" TEXT NOT NULL,
    "resultValue" TEXT NOT NULL,
    "flag" TEXT,
    "refLow" TEXT,
    "refHigh" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PatientLabResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PatientLabPanel_patientRecordId_key" ON "PatientLabPanel"("patientRecordId");
CREATE INDEX IF NOT EXISTS "PatientLabPanel_patientId_reportDate_idx" ON "PatientLabPanel"("patientId", "reportDate");
CREATE INDEX IF NOT EXISTS "PatientLabResult_panelId_sortOrder_idx" ON "PatientLabResult"("panelId", "sortOrder");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'PatientLabPanel_patientId_fkey'
          AND table_name = 'PatientLabPanel'
    ) THEN
        ALTER TABLE "PatientLabPanel"
            ADD CONSTRAINT "PatientLabPanel_patientId_fkey"
            FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'PatientLabPanel_patientRecordId_fkey'
          AND table_name = 'PatientLabPanel'
    ) THEN
        ALTER TABLE "PatientLabPanel"
            ADD CONSTRAINT "PatientLabPanel_patientRecordId_fkey"
            FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'PatientLabResult_panelId_fkey'
          AND table_name = 'PatientLabResult'
    ) THEN
        ALTER TABLE "PatientLabResult"
            ADD CONSTRAINT "PatientLabResult_panelId_fkey"
            FOREIGN KEY ("panelId") REFERENCES "PatientLabPanel"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
