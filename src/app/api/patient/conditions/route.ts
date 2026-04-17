import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { PatientConditionStatus } from "@prisma/client";

async function getPatientIdFromSession() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "PATIENT") {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    const userId = (session.user as any).id as string;
    const patient = await prisma.patient.findUnique({ where: { userId }, select: { id: true } });
    if (!patient) {
        return { error: NextResponse.json({ error: "Patient not found" }, { status: 404 }) };
    }
    return { patientId: patient.id };
}

export async function GET() {
    const auth = await getPatientIdFromSession();
    if (auth.error) return auth.error;

    const conditions = await prisma.patientCondition.findMany({
        where: { patientId: auth.patientId },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });
    return NextResponse.json(conditions);
}

export async function POST(req: Request) {
    const auth = await getPatientIdFromSession();
    if (auth.error) return auth.error;

    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) {
        return NextResponse.json({ error: "Condition name is required" }, { status: 400 });
    }
    const status = Object.values(PatientConditionStatus).includes(body.status)
        ? (body.status as PatientConditionStatus)
        : PatientConditionStatus.ACTIVE;

    const condition = await prisma.patientCondition.create({
        data: {
            patientId: auth.patientId,
            name,
            icd10Code: typeof body.icd10Code === "string" ? body.icd10Code.trim() : null,
            status,
            diagnosedAt: body.diagnosedAt ? new Date(body.diagnosedAt) : null,
            notes: typeof body.notes === "string" ? body.notes.trim() : null,
        },
    });

    return NextResponse.json(condition, { status: 201 });
}

export async function PATCH(req: Request) {
    const auth = await getPatientIdFromSession();
    if (auth.error) return auth.error;
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const existing = await prisma.patientCondition.findFirst({ where: { id, patientId: auth.patientId } });
    if (!existing) return NextResponse.json({ error: "Condition not found" }, { status: 404 });

    const body = await req.json();
    const status = Object.values(PatientConditionStatus).includes(body.status)
        ? (body.status as PatientConditionStatus)
        : existing.status;

    const updated = await prisma.patientCondition.update({
        where: { id },
        data: {
            name: typeof body.name === "string" ? body.name.trim() : existing.name,
            icd10Code: typeof body.icd10Code === "string" ? body.icd10Code.trim() : existing.icd10Code,
            status,
            diagnosedAt: body.diagnosedAt ? new Date(body.diagnosedAt) : existing.diagnosedAt,
            notes: typeof body.notes === "string" ? body.notes.trim() : existing.notes,
        },
    });

    return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
    const auth = await getPatientIdFromSession();
    if (auth.error) return auth.error;
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const existing = await prisma.patientCondition.findFirst({ where: { id, patientId: auth.patientId } });
    if (!existing) return NextResponse.json({ error: "Condition not found" }, { status: 404 });

    await prisma.patientCondition.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
