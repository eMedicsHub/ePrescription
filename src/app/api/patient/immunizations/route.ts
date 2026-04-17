import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPatientAuthContext } from "../_utils";

export async function GET() {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;

    const rows = await prisma.patientImmunization.findMany({
        where: { patientId: auth.patientId },
        orderBy: [{ administeredAt: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(rows);
}

export async function POST(req: Request) {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const body = await req.json();
    const vaccine = String(body.vaccine || "").trim();
    if (!vaccine) return NextResponse.json({ error: "Vaccine name is required" }, { status: 400 });

    const created = await prisma.patientImmunization.create({
        data: {
            patientId: auth.patientId,
            vaccine,
            doseNumber: typeof body.doseNumber === "string" ? body.doseNumber.trim() : null,
            administeredAt: body.administeredAt ? new Date(body.administeredAt) : null,
            administeredBy: typeof body.administeredBy === "string" ? body.administeredBy.trim() : null,
            facility: typeof body.facility === "string" ? body.facility.trim() : null,
            lotNumber: typeof body.lotNumber === "string" ? body.lotNumber.trim() : null,
            nextDueAt: body.nextDueAt ? new Date(body.nextDueAt) : null,
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
    const existing = await prisma.patientImmunization.findFirst({ where: { id, patientId: auth.patientId } });
    if (!existing) return NextResponse.json({ error: "Immunization not found" }, { status: 404 });

    const body = await req.json();
    const updated = await prisma.patientImmunization.update({
        where: { id },
        data: {
            vaccine: typeof body.vaccine === "string" ? body.vaccine.trim() : existing.vaccine,
            doseNumber: typeof body.doseNumber === "string" ? body.doseNumber.trim() : existing.doseNumber,
            administeredAt: body.administeredAt ? new Date(body.administeredAt) : existing.administeredAt,
            nextDueAt: body.nextDueAt ? new Date(body.nextDueAt) : existing.nextDueAt,
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
    const existing = await prisma.patientImmunization.findFirst({ where: { id, patientId: auth.patientId } });
    if (!existing) return NextResponse.json({ error: "Immunization not found" }, { status: 404 });

    await prisma.patientImmunization.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
