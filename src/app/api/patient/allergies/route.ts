import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { PatientAllergyCategory, PatientSeverityLevel } from "@prisma/client";

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

    const allergies = await prisma.patientAllergy.findMany({
        where: { patientId: auth.patientId },
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(allergies);
}

export async function POST(req: Request) {
    const auth = await getPatientIdFromSession();
    if (auth.error) return auth.error;

    const body = await req.json();
    const allergen = String(body.allergen || "").trim();
    if (!allergen) {
        return NextResponse.json({ error: "Allergen is required" }, { status: 400 });
    }

    const category = Object.values(PatientAllergyCategory).includes(body.category)
        ? (body.category as PatientAllergyCategory)
        : PatientAllergyCategory.OTHER;
    const severity = Object.values(PatientSeverityLevel).includes(body.severity)
        ? (body.severity as PatientSeverityLevel)
        : null;

    const allergy = await prisma.patientAllergy.create({
        data: {
            patientId: auth.patientId,
            allergen,
            category,
            severity,
            reaction: typeof body.reaction === "string" ? body.reaction.trim() : null,
            isActive: body.isActive !== false,
            notes: typeof body.notes === "string" ? body.notes.trim() : null,
        },
    });

    return NextResponse.json(allergy, { status: 201 });
}

export async function PATCH(req: Request) {
    const auth = await getPatientIdFromSession();
    if (auth.error) return auth.error;
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const existing = await prisma.patientAllergy.findFirst({ where: { id, patientId: auth.patientId } });
    if (!existing) return NextResponse.json({ error: "Allergy not found" }, { status: 404 });

    const body = await req.json();
    const category = Object.values(PatientAllergyCategory).includes(body.category)
        ? (body.category as PatientAllergyCategory)
        : existing.category;
    const severity = body.severity == null || body.severity === ""
        ? null
        : (Object.values(PatientSeverityLevel).includes(body.severity)
            ? (body.severity as PatientSeverityLevel)
            : existing.severity);

    const updated = await prisma.patientAllergy.update({
        where: { id },
        data: {
            allergen: typeof body.allergen === "string" ? body.allergen.trim() : existing.allergen,
            category,
            severity,
            reaction: typeof body.reaction === "string" ? body.reaction.trim() : existing.reaction,
            isActive: typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
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

    const existing = await prisma.patientAllergy.findFirst({ where: { id, patientId: auth.patientId } });
    if (!existing) return NextResponse.json({ error: "Allergy not found" }, { status: 404 });

    await prisma.patientAllergy.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
