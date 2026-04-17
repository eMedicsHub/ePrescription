import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPatientAuthContext } from "../_utils";

export async function GET() {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const rows = await prisma.patientInsurancePolicy.findMany({
        where: { patientId: auth.patientId },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(rows);
}

export async function POST(req: Request) {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const body = await req.json();
    const provider = String(body.provider || "").trim();
    if (!provider) return NextResponse.json({ error: "Provider is required" }, { status: 400 });
    const isPrimary = Boolean(body.isPrimary);
    if (isPrimary) {
        await prisma.patientInsurancePolicy.updateMany({
            where: { patientId: auth.patientId, isPrimary: true },
            data: { isPrimary: false },
        });
    }

    const created = await prisma.patientInsurancePolicy.create({
        data: {
            patientId: auth.patientId,
            provider,
            planName: typeof body.planName === "string" ? body.planName.trim() : null,
            memberId: typeof body.memberId === "string" ? body.memberId.trim() : null,
            policyNumber: typeof body.policyNumber === "string" ? body.policyNumber.trim() : null,
            groupNumber: typeof body.groupNumber === "string" ? body.groupNumber.trim() : null,
            validFrom: body.validFrom ? new Date(body.validFrom) : null,
            validTo: body.validTo ? new Date(body.validTo) : null,
            isPrimary,
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
    const existing = await prisma.patientInsurancePolicy.findFirst({ where: { id, patientId: auth.patientId } });
    if (!existing) return NextResponse.json({ error: "Insurance policy not found" }, { status: 404 });
    const body = await req.json();
    const isPrimary = typeof body.isPrimary === "boolean" ? body.isPrimary : existing.isPrimary;
    if (isPrimary) {
        await prisma.patientInsurancePolicy.updateMany({
            where: { patientId: auth.patientId, isPrimary: true, NOT: { id } },
            data: { isPrimary: false },
        });
    }

    const updated = await prisma.patientInsurancePolicy.update({
        where: { id },
        data: {
            provider: typeof body.provider === "string" ? body.provider.trim() : existing.provider,
            planName: typeof body.planName === "string" ? body.planName.trim() : existing.planName,
            memberId: typeof body.memberId === "string" ? body.memberId.trim() : existing.memberId,
            policyNumber: typeof body.policyNumber === "string" ? body.policyNumber.trim() : existing.policyNumber,
            groupNumber: typeof body.groupNumber === "string" ? body.groupNumber.trim() : existing.groupNumber,
            validFrom: body.validFrom ? new Date(body.validFrom) : existing.validFrom,
            validTo: body.validTo ? new Date(body.validTo) : existing.validTo,
            isPrimary,
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
    const existing = await prisma.patientInsurancePolicy.findFirst({ where: { id, patientId: auth.patientId } });
    if (!existing) return NextResponse.json({ error: "Insurance policy not found" }, { status: 404 });
    await prisma.patientInsurancePolicy.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
