import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPatientAuthContext } from "../_utils";

export async function GET() {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const rows = await prisma.patientSurgery.findMany({
        where: { patientId: auth.patientId },
        orderBy: [{ surgeryDate: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(rows);
}

export async function POST(req: Request) {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const body = await req.json();
    const procedureName = String(body.procedureName || "").trim();
    if (!procedureName) return NextResponse.json({ error: "Procedure name is required" }, { status: 400 });

    const created = await prisma.patientSurgery.create({
        data: {
            patientId: auth.patientId,
            procedureName,
            surgeryDate: body.surgeryDate ? new Date(body.surgeryDate) : null,
            hospital: typeof body.hospital === "string" ? body.hospital.trim() : null,
            surgeon: typeof body.surgeon === "string" ? body.surgeon.trim() : null,
            outcome: typeof body.outcome === "string" ? body.outcome.trim() : null,
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
    const existing = await prisma.patientSurgery.findFirst({ where: { id, patientId: auth.patientId } });
    if (!existing) return NextResponse.json({ error: "Surgery record not found" }, { status: 404 });

    const body = await req.json();
    const updated = await prisma.patientSurgery.update({
        where: { id },
        data: {
            procedureName: typeof body.procedureName === "string" ? body.procedureName.trim() : existing.procedureName,
            surgeryDate: body.surgeryDate ? new Date(body.surgeryDate) : existing.surgeryDate,
            hospital: typeof body.hospital === "string" ? body.hospital.trim() : existing.hospital,
            surgeon: typeof body.surgeon === "string" ? body.surgeon.trim() : existing.surgeon,
            outcome: typeof body.outcome === "string" ? body.outcome.trim() : existing.outcome,
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
    const existing = await prisma.patientSurgery.findFirst({ where: { id, patientId: auth.patientId } });
    if (!existing) return NextResponse.json({ error: "Surgery record not found" }, { status: 404 });
    await prisma.patientSurgery.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
