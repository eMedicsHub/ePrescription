import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { downloadPatientRecordBlob } from "@/lib/storage";
import { Readable } from "node:stream";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
    const session = await getServerSession(authOptions);

    if (!session || !["PATIENT", "DOCTOR"].includes((session.user as any).role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const record = await (prisma as any).patientRecord.findUnique({
        where: { id },
        include: {
            patient: true,
        },
    });

    if (!record || !record.storagePath) {
        return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const role = (session.user as any).role;
    const userId = (session.user as any).id;

    if (role === "PATIENT") {
        const patient = await prisma.patient.findUnique({ where: { userId } });
        if (!patient || patient.id !== record.patientId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    if (role === "DOCTOR") {
        const consent = await (prisma as any).consent.findUnique({
            where: {
                patientId_doctorId: {
                    patientId: record.patientId,
                    doctorId: userId,
                },
            },
        });

        if (!consent) {
            return NextResponse.json({ error: "Active patient consent required" }, { status: 403 });
        }

        const consentRecord = consent as any;
        if (consentRecord.status !== "ACTIVE") {
            return NextResponse.json({ error: "Active patient consent required" }, { status: 403 });
        }

        if (consentRecord.expiresAt && new Date(consentRecord.expiresAt) < new Date()) {
            return NextResponse.json({ error: "Active patient consent required" }, { status: 403 });
        }
    }

    const blob = await downloadPatientRecordBlob(record.storagePath);
    const webStream = Readable.toWeb(blob.stream as Readable) as ReadableStream;

    return new NextResponse(webStream, {
        headers: {
            "Content-Type": blob.mimeType,
            ...(blob.contentLength ? { "Content-Length": String(blob.contentLength) } : {}),
            "Content-Disposition": `inline; filename="${record.originalFileName || record.id}"`,
        },
    });
}