import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { uploadPatientRecordBlob } from "@/lib/storage";

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

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !["PATIENT", "DOCTOR"].includes((session.user as any).role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!(prisma as any).patientRecord) {
            console.warn("PATIENT_RECORDS_WARN stale Prisma client detected");
            return NextResponse.json([]);
        }

        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category");
        const patientId = searchParams.get("patientId") || undefined;

        const patient = await resolvePatientForSession(session, patientId);
        if (!patient) {
            return NextResponse.json({ error: "Patient not found or unauthorized" }, { status: 404 });
        }

        const records = await (prisma as any).patientRecord.findMany({
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

        return NextResponse.json(records);
    } catch (error) {
        console.error("PATIENT_RECORDS_ERROR", error);
        return NextResponse.json({ error: "Failed to load records" }, { status: 500 });
    }
}

export async function POST(req: Request) {
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
    const patientId = String(formData.get("patientId") || "").trim() || undefined;
    const file = formData.get("file");
    const role = (session.user as any).role;

    if (!title || !allowedCategories.has(category)) {
        return NextResponse.json({ error: "Missing title or invalid category" }, { status: 400 });
    }

    if (file && !(file instanceof File)) {
        return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }

    if (role === "DOCTOR" && !patientId) {
        return NextResponse.json({ error: "Doctor uploads require patientId" }, { status: 400 });
    }

    const patient = await resolvePatientForSession(session, patientId);
    if (!patient) {
        return NextResponse.json({ error: "Active patient consent required" }, { status: 403 });
    }

    const createdByUserId = (session.user as any).id;
    const sourcePortal = role === "DOCTOR" ? "DOCTOR" : "PATIENT";

    const recordId = crypto.randomUUID();
    const uploadResult = file instanceof File && file.size > 0
        ? await uploadPatientRecordBlob({
            file,
            patientUniversalId: patient.universalId,
            category,
            recordId,
        })
        : null;

    const record = await (prisma as any).patientRecord.create({
        data: {
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
            occurredAt: occurredAtValue ? new Date(occurredAtValue) : new Date(),
        },
        include: {
            doctor: {
                select: { id: true, name: true, email: true },
            },
            createdBy: {
                select: { id: true, name: true, email: true, role: true },
            },
            linkedPrescription: {
                select: { id: true, status: true, createdAt: true },
            },
        },
    });

    return NextResponse.json(record);
}
