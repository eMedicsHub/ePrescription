import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { uploadPatientRecordBlob } from "@/lib/storage";
import { Prisma } from "@prisma/client";

type LabResultRow = {
    testProfile: string;
    test: string;
    result: string;
    flag: string;
    refLow: string;
    refHigh: string;
    refValue: string;
};

const allowedCategories = new Set([
    "PRESCRIPTION",
    "LAB_REPORT",
    "IMAGING",
    "CONSULTATION_NOTE",
    "DISCHARGE_SUMMARY",
    "MEDICAL_BILL",
    "OTHER",
]);

async function resolvePatientForSession(session: any, requestedPatientId?: string) {
    const role = (session.user as any).role;
    const userId = (session.user as any).id;

    if (role === "PATIENT") {
        return prisma.patient.findUnique({
            where: { userId },
            include: { user: true },
        });
    }

    if (role === "DOCTOR" && requestedPatientId) {
        const consent = await (prisma as any).consent.findUnique({
            where: {
                patientId_doctorId: {
                    patientId: requestedPatientId,
                    doctorId: userId,
                },
            },
        });

        if (!consent) {
            return null;
        }

        const consentRecord = consent as any;
        if (consentRecord.status !== "ACTIVE") {
            return null;
        }

        if (consentRecord.expiresAt && new Date(consentRecord.expiresAt) < new Date()) {
            return null;
        }

        return prisma.patient.findUnique({
            where: { id: requestedPatientId },
            include: { user: true },
        });
    }

    return null;
}

async function listRecordsRaw(patientId: string, category?: string | null) {
    const categoryFilter = category
        ? Prisma.sql`AND pr."category" = CAST(${category} AS "PatientRecordCategory")`
        : Prisma.empty;

    return prisma.$queryRaw(Prisma.sql`
        SELECT
            pr."id",
            pr."title",
            pr."description",
            pr."category",
            pr."tags",
            pr."sourcePortal",
            pr."storagePath",
            pr."originalFileName",
            pr."mimeType",
            pr."sizeBytes",
            pr."amount",
            pr."reportDate",
            pr."reports",
            pr."labResults",
            pr."occurredAt",
            pr."createdAt",
            CASE
                WHEN d."id" IS NULL THEN NULL
                ELSE json_build_object('id', d."id", 'name', d."name", 'email', d."email")
            END AS "doctor",
            json_build_object('id', cb."id", 'name', cb."name", 'email', cb."email", 'role', cb."role") AS "createdBy",
            CASE
                WHEN lp."id" IS NULL THEN NULL
                ELSE json_build_object('id', lp."id", 'status', lp."status", 'createdAt', lp."createdAt")
            END AS "linkedPrescription"
        FROM "PatientRecord" pr
        LEFT JOIN "User" d ON d."id" = pr."doctorId"
        LEFT JOIN "User" cb ON cb."id" = pr."createdByUserId"
        LEFT JOIN "Prescription" lp ON lp."id" = pr."linkedPrescriptionId"
        WHERE pr."patientId" = ${patientId}
        ${categoryFilter}
        ORDER BY pr."occurredAt" DESC
    `);
}

async function writeNormalizedLabData(params: {
    patientId: string;
    patientRecordId: string;
    sourcePortal: "PATIENT" | "DOCTOR";
    reportDate: Date | null;
    reports: string[];
    labResults: LabResultRow[];
}) {
    if (!params.labResults.length) {
        return;
    }

    const panelName = params.reports[0] || params.labResults[0]?.testProfile || null;
    const panelDelegate = (prisma as any).patientLabPanel;
    const resultDelegate = (prisma as any).patientLabResult;

    if (!panelDelegate || typeof panelDelegate.create !== "function" || !resultDelegate || typeof resultDelegate.createMany !== "function") {
        console.warn("PATIENT_RECORDS_WARN normalized lab delegates unavailable; skipping normalized write");
        return;
    }

    try {
        await prisma.$transaction(async (tx: any) => {
            const panel = await tx.patientLabPanel.create({
                data: {
                    patientId: params.patientId,
                    patientRecordId: params.patientRecordId,
                    panelName,
                    reportDate: params.reportDate,
                    sourcePortal: params.sourcePortal,
                },
            });

            await tx.patientLabResult.createMany({
                data: params.labResults.map((row, index) => ({
                    panelId: panel.id,
                    testProfile: row.testProfile || null,
                    testName: row.test || "",
                    resultValue: row.result || "",
                    flag: row.flag || null,
                    refLow: row.refLow || null,
                    refHigh: row.refHigh || null,
                    sortOrder: index,
                })),
            });
        });
    } catch (error) {
        console.warn("PATIENT_RECORDS_WARN failed to write normalized lab data", error);
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !["PATIENT", "DOCTOR"].includes((session.user as any).role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category");
        const patientId = searchParams.get("patientId") || undefined;

        const patient = await resolvePatientForSession(session, patientId);
        if (!patient) {
            return NextResponse.json({ error: "Patient not found or unauthorized" }, { status: 404 });
        }

        const patientRecordDelegate = (prisma as any).patientRecord;
        let records;
        if (!patientRecordDelegate || typeof patientRecordDelegate.findMany !== "function") {
            console.warn("PATIENT_RECORDS_WARN stale Prisma client detected, using raw query fallback");
            records = await listRecordsRaw(patient.id, category);
        } else {
            records = await patientRecordDelegate.findMany({
                where: {
                    patientId: patient.id,
                    ...(category ? { category } : {}),
                },
                orderBy: {
                    occurredAt: "desc",
                },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    category: true,
                    tags: true,
                    sourcePortal: true,
                    storagePath: true,
                    originalFileName: true,
                    mimeType: true,
                    sizeBytes: true,
                    amount: true,
                    reportDate: true,
                    reports: true,
                    labResults: true,
                    occurredAt: true,
                    createdAt: true,
                    doctor: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                        },
                    },
                    linkedPrescription: {
                        select: {
                            id: true,
                            status: true,
                            createdAt: true,
                        },
                    },
                },
            });
        }

        return NextResponse.json(records);
    } catch (error) {
        console.error("PATIENT_RECORDS_ERROR", error);
        return NextResponse.json({ error: "Failed to load records" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !["PATIENT", "DOCTOR"].includes((session.user as any).role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const title = String(formData.get("title") || "").trim();
        const description = String(formData.get("description") || "").trim();
        const category = String(formData.get("category") || "").trim().toUpperCase();
        const tags = String(formData.get("tags") || "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean);
        const linkedPrescriptionId = String(formData.get("linkedPrescriptionId") || "").trim() || null;
        const occurredAtValue = String(formData.get("occurredAt") || "").trim();
        const amountValue = String(formData.get("amount") || "").trim();
        const reportDateValue = String(formData.get("reportDate") || "").trim();
        const reports = String(formData.get("reports") || "")
            .split("\n")
            .map((entry) => entry.trim())
            .filter(Boolean);
        const labResultsRaw = String(formData.get("labResults") || "").trim();
        const patientId = String(formData.get("patientId") || "").trim() || undefined;
        const file = formData.get("file");
        const role = (session.user as any).role;
        let labResults: LabResultRow[] = [];

        if (!title || !allowedCategories.has(category)) {
            return NextResponse.json({ error: "Missing title or invalid category" }, { status: 400 });
        }

        if (file && !(file instanceof File)) {
            return NextResponse.json({ error: "Invalid file" }, { status: 400 });
        }

        if (role === "DOCTOR" && !patientId) {
            return NextResponse.json({ error: "Doctor uploads require patientId" }, { status: 400 });
        }

        if (labResultsRaw) {
            try {
                const parsed = JSON.parse(labResultsRaw);
                if (!Array.isArray(parsed)) {
                    return NextResponse.json({ error: "Invalid lab results format" }, { status: 400 });
                }

                labResults = parsed
                    .map((row: any) => ({
                        ...(function () {
                            const legacyRef = String(row?.refValue || "").trim();
                            const split = legacyRef ? legacyRef.split("-").map((part: string) => part.trim()) : [];
                            return {
                                refLow: String(row?.refLow || split[0] || "").trim(),
                                refHigh: String(row?.refHigh || split[1] || "").trim(),
                                refValue: legacyRef,
                            };
                        })(),
                        testProfile: String(row?.testProfile || "").trim(),
                        test: String(row?.test || "").trim(),
                        result: String(row?.result || "").trim(),
                        flag: String(row?.flag || "").trim(),
                    }))
                    .filter((row) => row.testProfile || row.test || row.result || row.flag || row.refLow || row.refHigh || row.refValue);
            } catch {
                return NextResponse.json({ error: "Invalid lab results payload" }, { status: 400 });
            }
        }

        if (category === "LAB_REPORT" && !reportDateValue) {
            return NextResponse.json({ error: "Lab reports require a report date" }, { status: 400 });
        }

        if (category === "LAB_REPORT" && labResults.length === 0) {
            return NextResponse.json({ error: "Add at least one lab result row" }, { status: 400 });
        }

        const patient = await resolvePatientForSession(session, patientId);
        if (!patient) {
            return NextResponse.json({ error: "Active patient consent required" }, { status: 403 });
        }

        const createdByUserId = (session.user as any).id;
        const sourcePortal = role === "DOCTOR" ? "DOCTOR" : "PATIENT";
        const reportDate = reportDateValue ? new Date(reportDateValue) : null;
        const occurredAt = category === "LAB_REPORT" && reportDate
            ? reportDate
            : occurredAtValue
                ? new Date(occurredAtValue)
                : new Date();

        const recordId = crypto.randomUUID();
        const uploadResult = file instanceof File && file.size > 0
            ? await uploadPatientRecordBlob({
                file,
                patientUniversalId: patient.universalId,
                category,
                recordId,
            })
            : null;

        const baseData: Record<string, any> = {
            id: recordId,
            patientId: patient.id,
            createdByUserId,
            doctorId: role === "DOCTOR" ? createdByUserId : null,
            linkedPrescriptionId,
            sourcePortal,
            category,
            title,
            description: description || null,
            tags,
            storagePath: uploadResult?.blobName || null,
            originalFileName: uploadResult?.originalFileName || null,
            mimeType: uploadResult?.mimeType || null,
            sizeBytes: uploadResult?.sizeBytes || null,
            checksum: uploadResult?.checksum || null,
            amount: amountValue ? amountValue : null,
            reportDate,
            reports,
            occurredAt,
        };
        if (category === "LAB_REPORT") {
            baseData.labResults = labResults;
        }

        const include = {
            doctor: {
                select: { id: true, name: true, email: true },
            },
            createdBy: {
                select: { id: true, name: true, email: true, role: true },
            },
            linkedPrescription: {
                select: { id: true, status: true, createdAt: true },
            },
        };

        const patientRecordDelegate = (prisma as any).patientRecord;
        let record;
        try {
            if (patientRecordDelegate && typeof patientRecordDelegate.create === "function") {
                record = await patientRecordDelegate.create({
                    data: baseData,
                    include,
                });
            } else {
                console.warn("PATIENT_RECORDS_POST_WARN stale Prisma client detected, using raw insert fallback");
                const tagsSql = tags.length ? Prisma.sql`ARRAY[${Prisma.join(tags)}]::text[]` : Prisma.sql`ARRAY[]::text[]`;
                const reportsSql = reports.length ? Prisma.sql`ARRAY[${Prisma.join(reports)}]::text[]` : Prisma.sql`ARRAY[]::text[]`;
                const amountSql = amountValue ? Prisma.sql`CAST(${amountValue} AS numeric(10,2))` : Prisma.sql`NULL`;
                const labResultsSql = category === "LAB_REPORT"
                    ? Prisma.sql`CAST(${JSON.stringify(labResults)} AS jsonb)`
                    : Prisma.sql`NULL`;

                await prisma.$executeRaw(Prisma.sql`
                    INSERT INTO "PatientRecord" (
                        "id", "patientId", "createdByUserId", "doctorId", "linkedPrescriptionId",
                        "sourcePortal", "category", "title", "description", "tags",
                        "storagePath", "originalFileName", "mimeType", "sizeBytes", "checksum",
                        "amount", "reportDate", "reports", "labResults", "occurredAt"
                    )
                    VALUES (
                        ${recordId}, ${patient.id}, ${createdByUserId}, ${role === "DOCTOR" ? createdByUserId : null}, ${linkedPrescriptionId},
                        CAST(${sourcePortal} AS "PatientRecordSourcePortal"), CAST(${category} AS "PatientRecordCategory"), ${title}, ${description || null}, ${tagsSql},
                        ${uploadResult?.blobName || null}, ${uploadResult?.originalFileName || null}, ${uploadResult?.mimeType || null}, ${uploadResult?.sizeBytes || null}, ${uploadResult?.checksum || null},
                        ${amountSql}, ${reportDate}, ${reportsSql}, ${labResultsSql}, ${occurredAt}
                    )
                `);

                record = { id: recordId };
            }
        } catch (error: any) {
            const message = String(error?.message || "");
            if (message.includes("labResults") || (message.includes("column") && message.includes("labResults"))) {
                console.warn("PATIENT_RECORDS_WARN labResults column unavailable, saving without labResults");
                const fallbackData = { ...baseData };
                delete fallbackData.labResults;
                if (patientRecordDelegate && typeof patientRecordDelegate.create === "function") {
                    record = await patientRecordDelegate.create({
                        data: fallbackData,
                        include,
                    });
                } else {
                    const tagsSql = tags.length ? Prisma.sql`ARRAY[${Prisma.join(tags)}]::text[]` : Prisma.sql`ARRAY[]::text[]`;
                    const reportsSql = reports.length ? Prisma.sql`ARRAY[${Prisma.join(reports)}]::text[]` : Prisma.sql`ARRAY[]::text[]`;
                    const amountSql = amountValue ? Prisma.sql`CAST(${amountValue} AS numeric(10,2))` : Prisma.sql`NULL`;
                    await prisma.$executeRaw(Prisma.sql`
                        INSERT INTO "PatientRecord" (
                            "id", "patientId", "createdByUserId", "doctorId", "linkedPrescriptionId",
                            "sourcePortal", "category", "title", "description", "tags",
                            "storagePath", "originalFileName", "mimeType", "sizeBytes", "checksum",
                            "amount", "reportDate", "reports", "occurredAt"
                        )
                        VALUES (
                            ${recordId}, ${patient.id}, ${createdByUserId}, ${role === "DOCTOR" ? createdByUserId : null}, ${linkedPrescriptionId},
                            CAST(${sourcePortal} AS "PatientRecordSourcePortal"), CAST(${category} AS "PatientRecordCategory"), ${title}, ${description || null}, ${tagsSql},
                            ${uploadResult?.blobName || null}, ${uploadResult?.originalFileName || null}, ${uploadResult?.mimeType || null}, ${uploadResult?.sizeBytes || null}, ${uploadResult?.checksum || null},
                            ${amountSql}, ${reportDate}, ${reportsSql}, ${occurredAt}
                        )
                    `);
                    record = { id: recordId };
                }
            } else {
                throw error;
            }
        }

        if (category === "LAB_REPORT") {
            await writeNormalizedLabData({
                patientId: patient.id,
                patientRecordId: record.id || recordId,
                sourcePortal: sourcePortal as "PATIENT" | "DOCTOR",
                reportDate,
                reports,
                labResults,
            });
        }

        return NextResponse.json(record);
    } catch (error) {
        console.error("PATIENT_RECORDS_POST_ERROR", error);
        return NextResponse.json({ error: "Failed to save record" }, { status: 500 });
    }
}
