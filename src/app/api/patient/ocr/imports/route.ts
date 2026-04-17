import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPatientAuthContext } from "../../_utils";
import { runOcrAndParse } from "@/lib/ocr";
import { uploadPatientRecordBlob } from "@/lib/storage";
import { appLog, createRequestContext } from "@/lib/logger";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const rows = await prisma.ocrImportJob.findMany({
        where: { patientId: auth.patientId },
        orderBy: { createdAt: "desc" },
        take: 50,
    });
    return NextResponse.json(rows);
}

export async function POST(req: Request) {
    const ctx = createRequestContext(req, { module: "ocr-imports" });
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
        return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    const patient = await prisma.patient.findUnique({
        where: { id: auth.patientId },
        select: { id: true, universalId: true, userId: true },
    });
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    let job = await prisma.ocrImportJob.create({
        data: {
            patientId: patient.id,
            filename: file.name,
            mimeType: file.type || null,
            status: "PROCESSING",
        },
    });

    try {
        const { parsed, provider } = await runOcrAndParse(file);
        let sourceRecordId: string | null = null;

        if (parsed.category === "LAB_REPORT" || parsed.category === "PRESCRIPTION") {
            const recordId = crypto.randomUUID();
            const uploaded = await uploadPatientRecordBlob({
                file,
                patientUniversalId: patient.universalId,
                category: parsed.category,
                recordId,
            });
            const createdRecord = await prisma.patientRecord.create({
                data: {
                    id: recordId,
                    patientId: patient.id,
                    createdByUserId: patient.userId,
                    sourcePortal: "PATIENT",
                    category: parsed.category,
                    title: parsed.title || `${parsed.category} OCR Import`,
                    description: "Auto-imported from OCR pipeline",
                    tags: ["ocr-import"],
                    storagePath: uploaded.blobName,
                    originalFileName: uploaded.originalFileName,
                    mimeType: uploaded.mimeType,
                    sizeBytes: uploaded.sizeBytes,
                    checksum: uploaded.checksum,
                    reportDate: parsed.reportDate ? new Date(parsed.reportDate) : null,
                    reports: parsed.reports || [],
                    labResults: parsed.labResults ? (parsed.labResults as any) : Prisma.JsonNull,
                },
                select: { id: true },
            });
            sourceRecordId = createdRecord.id;
        }

        if (Array.isArray(parsed.immunizations) && parsed.immunizations.length > 0) {
            await prisma.patientImmunization.createMany({
                data: parsed.immunizations.map((row) => ({
                    patientId: patient.id,
                    vaccine: row.vaccine,
                    doseNumber: row.doseNumber || null,
                    administeredAt: row.administeredAt ? new Date(row.administeredAt) : null,
                    notes: "OCR imported",
                })),
                skipDuplicates: false,
            });
        }

        if (Array.isArray(parsed.medications) && parsed.medications.length > 0) {
            await prisma.medicationSchedule.createMany({
                data: parsed.medications.map((m) => ({
                    patientId: patient.id,
                    medicationName: m.name,
                    dosage: m.dosage || null,
                    frequency: m.frequency || "Unknown",
                    instruction: m.duration || null,
                    timesPerDay: 1,
                    reminderTimes: [],
                })),
            });
        }

        job = await prisma.ocrImportJob.update({
            where: { id: job.id },
            data: {
                status: "COMPLETED",
                provider,
                sourceRecordId,
                extractedText: parsed.rawText || null,
                extractedPayload: parsed as any,
                completedAt: new Date(),
            },
        });

        appLog("info", "OCR import completed", { ...ctx, jobId: job.id, provider, sourceRecordId });
        return NextResponse.json(job, { status: 201 });
    } catch (error: any) {
        const message = String(error?.message || "OCR import failed");
        job = await prisma.ocrImportJob.update({
            where: { id: job.id },
            data: {
                status: "FAILED",
                errorMessage: message,
                completedAt: new Date(),
            },
        });
        appLog("error", "OCR import failed", { ...ctx, jobId: job.id, error: message });
        return NextResponse.json({ error: message, jobId: job.id }, { status: 500 });
    }
}
