import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { RecordShareScope, RecordShareStatus, Role } from "@prisma/client";
import { getPatientAuthContext } from "../_utils";
import { appLog, createRequestContext } from "@/lib/logger";

function isSharingEnabled() {
    return (process.env.ENABLE_RECORD_SHARING || "true").toLowerCase() === "true";
}

export async function GET(req: Request) {
    const ctx = createRequestContext(req, { module: "share-grants" });
    if (!isSharingEnabled()) {
        appLog("warn", "Record sharing is disabled", ctx);
        return NextResponse.json({ error: "Record sharing is disabled" }, { status: 503 });
    }
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;

    const grants = await prisma.patientRecordShareGrant.findMany({
        where: { patientId: auth.patientId },
        include: {
            doctorUser: { select: { id: true, name: true, email: true } },
            records: { select: { recordId: true } },
        },
        orderBy: { createdAt: "desc" },
    });
    appLog("info", "Fetched share grants", { ...ctx, patientId: auth.patientId, count: grants.length });
    return NextResponse.json(grants);
}

export async function POST(req: Request) {
    const ctx = createRequestContext(req, { module: "share-grants" });
    if (!isSharingEnabled()) {
        appLog("warn", "Record sharing create blocked: disabled", ctx);
        return NextResponse.json({ error: "Record sharing is disabled" }, { status: 503 });
    }
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const body = await req.json();

    const doctorUserId = String(body.doctorUserId || "").trim();
    if (!doctorUserId) return NextResponse.json({ error: "doctorUserId is required" }, { status: 400 });
    const doctor = await prisma.user.findFirst({ where: { id: doctorUserId, role: Role.DOCTOR }, select: { id: true } });
    if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

    const scope = Object.values(RecordShareScope).includes(body.scope)
        ? (body.scope as RecordShareScope)
        : RecordShareScope.FULL_HISTORY;
    const allowedCategories = Array.isArray(body.allowedCategories) ? body.allowedCategories : [];
    const recordIds = Array.isArray(body.recordIds) ? body.recordIds : [];
    const defaultDays = Number(process.env.RECORD_SHARE_DEFAULT_DAYS || "30");
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : new Date(Date.now() + defaultDays * 24 * 60 * 60 * 1000);

    const grant = await prisma.patientRecordShareGrant.create({
        data: {
            patientId: auth.patientId,
            doctorUserId,
            createdByUserId: auth.userId,
            scope,
            allowedCategories,
            expiresAt,
            notes: typeof body.notes === "string" ? body.notes.trim() : null,
            records: scope === RecordShareScope.SELECTED_RECORDS ? {
                createMany: {
                    data: recordIds.map((recordId: string) => ({ recordId })),
                    skipDuplicates: true,
                },
            } : undefined,
        },
        include: {
            doctorUser: { select: { id: true, name: true, email: true } },
            records: { select: { recordId: true } },
        },
    });

    appLog("info", "Created share grant", { ...ctx, patientId: auth.patientId, doctorUserId, scope });
    return NextResponse.json(grant, { status: 201 });
}

export async function PATCH(req: Request) {
    const ctx = createRequestContext(req, { module: "share-grants" });
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const grant = await prisma.patientRecordShareGrant.findFirst({
        where: { id, patientId: auth.patientId },
        include: { records: true },
    });
    if (!grant) return NextResponse.json({ error: "Share grant not found" }, { status: 404 });

    const body = await req.json();
    const status = Object.values(RecordShareStatus).includes(body.status)
        ? (body.status as RecordShareStatus)
        : grant.status;
    const scope = Object.values(RecordShareScope).includes(body.scope)
        ? (body.scope as RecordShareScope)
        : grant.scope;

    await prisma.$transaction(async (tx) => {
        await tx.patientRecordShareGrant.update({
            where: { id },
            data: {
                status,
                scope,
                expiresAt: body.expiresAt ? new Date(body.expiresAt) : grant.expiresAt,
                revokedAt: status === RecordShareStatus.REVOKED ? new Date() : null,
                revokedReason: status === RecordShareStatus.REVOKED ? (body.revokedReason || null) : null,
            },
        });
        if (scope === RecordShareScope.SELECTED_RECORDS && Array.isArray(body.recordIds)) {
            await tx.patientRecordShareGrantRecord.deleteMany({ where: { grantId: id } });
            if (body.recordIds.length > 0) {
                await tx.patientRecordShareGrantRecord.createMany({
                    data: body.recordIds.map((recordId: string) => ({ grantId: id, recordId })),
                    skipDuplicates: true,
                });
            }
        }
    });

    const refreshed = await prisma.patientRecordShareGrant.findUnique({
        where: { id },
        include: {
            doctorUser: { select: { id: true, name: true, email: true } },
            records: { select: { recordId: true } },
        },
    });
    appLog("info", "Updated share grant", { ...ctx, grantId: id, status, scope });
    return NextResponse.json(refreshed);
}
