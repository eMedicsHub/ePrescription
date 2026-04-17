import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PatientFamilyConditionStatus } from "@prisma/client";
import { getPatientAuthContext } from "../_utils";

export async function GET() {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const rows = await prisma.patientFamilyHistory.findMany({
        where: { patientId: auth.patientId },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rows);
}

export async function POST(req: Request) {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const body = await req.json();
    const relation = String(body.relation || "").trim();
    const condition = String(body.condition || "").trim();
    if (!relation || !condition) {
        return NextResponse.json({ error: "Relation and condition are required" }, { status: 400 });
    }
    const status = Object.values(PatientFamilyConditionStatus).includes(body.status)
        ? (body.status as PatientFamilyConditionStatus)
        : PatientFamilyConditionStatus.PRESENT;

    const created = await prisma.patientFamilyHistory.create({
        data: {
            patientId: auth.patientId,
            relation,
            condition,
            status,
            diagnosedAge: body.diagnosedAge === "" || body.diagnosedAge == null ? null : Number(body.diagnosedAge),
            notes: typeof body.notes === "string" ? body.notes.trim() : null,
        },
    });
    return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: Request) {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const existing = await prisma.patientFamilyHistory.findFirst({ where: { id, patientId: auth.patientId } });
    if (!existing) return NextResponse.json({ error: "Family history record not found" }, { status: 404 });
    const body = await req.json();
    const status = Object.values(PatientFamilyConditionStatus).includes(body.status)
        ? (body.status as PatientFamilyConditionStatus)
        : existing.status;

    const updated = await prisma.patientFamilyHistory.update({
        where: { id },
        data: {
            relation: typeof body.relation === "string" ? body.relation.trim() : existing.relation,
            condition: typeof body.condition === "string" ? body.condition.trim() : existing.condition,
            status,
            diagnosedAge: body.diagnosedAge === "" || body.diagnosedAge == null ? existing.diagnosedAge : Number(body.diagnosedAge),
            notes: typeof body.notes === "string" ? body.notes.trim() : existing.notes,
        },
    });
    return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const existing = await prisma.patientFamilyHistory.findFirst({ where: { id, patientId: auth.patientId } });
    if (!existing) return NextResponse.json({ error: "Family history record not found" }, { status: 404 });
    await prisma.patientFamilyHistory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
