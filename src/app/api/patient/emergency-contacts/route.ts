import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

    const contacts = await prisma.patientEmergencyContact.findMany({
        where: { patientId: auth.patientId },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(contacts);
}

export async function POST(req: Request) {
    const auth = await getPatientIdFromSession();
    if (auth.error) return auth.error;

    const body = await req.json();
    const name = String(body.name || "").trim();
    const relationship = String(body.relationship || "").trim();
    const phone = String(body.phone || "").trim();

    if (!name || !relationship || !phone) {
        return NextResponse.json({ error: "Name, relationship, and phone are required" }, { status: 400 });
    }

    const isPrimary = Boolean(body.isPrimary);
    if (isPrimary) {
        await prisma.patientEmergencyContact.updateMany({
            where: { patientId: auth.patientId, isPrimary: true },
            data: { isPrimary: false },
        });
    }

    const contact = await prisma.patientEmergencyContact.create({
        data: {
            patientId: auth.patientId,
            name,
            relationship,
            phone,
            email: typeof body.email === "string" ? body.email.trim() : null,
            address: typeof body.address === "string" ? body.address.trim() : null,
            isPrimary,
        },
    });

    return NextResponse.json(contact, { status: 201 });
}

export async function PATCH(req: Request) {
    const auth = await getPatientIdFromSession();
    if (auth.error) return auth.error;
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const existing = await prisma.patientEmergencyContact.findFirst({ where: { id, patientId: auth.patientId } });
    if (!existing) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

    const body = await req.json();
    const isPrimary = typeof body.isPrimary === "boolean" ? body.isPrimary : existing.isPrimary;
    if (isPrimary) {
        await prisma.patientEmergencyContact.updateMany({
            where: { patientId: auth.patientId, isPrimary: true, NOT: { id } },
            data: { isPrimary: false },
        });
    }

    const updated = await prisma.patientEmergencyContact.update({
        where: { id },
        data: {
            name: typeof body.name === "string" ? body.name.trim() : existing.name,
            relationship: typeof body.relationship === "string" ? body.relationship.trim() : existing.relationship,
            phone: typeof body.phone === "string" ? body.phone.trim() : existing.phone,
            email: typeof body.email === "string" ? body.email.trim() : existing.email,
            address: typeof body.address === "string" ? body.address.trim() : existing.address,
            isPrimary,
        },
    });

    return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
    const auth = await getPatientIdFromSession();
    if (auth.error) return auth.error;
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const existing = await prisma.patientEmergencyContact.findFirst({ where: { id, patientId: auth.patientId } });
    if (!existing) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

    await prisma.patientEmergencyContact.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
