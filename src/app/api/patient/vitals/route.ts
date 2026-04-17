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

    const vitals = await prisma.patientVital.findMany({
        where: { patientId: auth.patientId },
        orderBy: { recordedAt: "desc" },
        take: 20,
    });

    return NextResponse.json(vitals);
}

export async function POST(req: Request) {
    const auth = await getPatientIdFromSession();
    if (auth.error) return auth.error;

    const body = await req.json();
    const parseNum = (value: unknown) => {
        if (value === "" || value == null) return null;
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    };

    const created = await prisma.patientVital.create({
        data: {
            patientId: auth.patientId,
            recordedAt: body.recordedAt ? new Date(body.recordedAt) : new Date(),
            heightCm: parseNum(body.heightCm),
            weightKg: parseNum(body.weightKg),
            temperatureC: parseNum(body.temperatureC),
            systolicBp: parseNum(body.systolicBp)?.valueOf() ?? null,
            diastolicBp: parseNum(body.diastolicBp)?.valueOf() ?? null,
            pulseBpm: parseNum(body.pulseBpm)?.valueOf() ?? null,
            spo2Percent: parseNum(body.spo2Percent)?.valueOf() ?? null,
            glucoseMgDl: parseNum(body.glucoseMgDl),
            bmi: parseNum(body.bmi),
            notes: typeof body.notes === "string" ? body.notes.trim() : null,
        },
    });

    return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: Request) {
    const auth = await getPatientIdFromSession();
    if (auth.error) return auth.error;
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const existing = await prisma.patientVital.findFirst({ where: { id, patientId: auth.patientId } });
    if (!existing) return NextResponse.json({ error: "Vital not found" }, { status: 404 });

    const body = await req.json();
    const parseNum = (value: unknown) => {
        if (value === "" || value == null) return null;
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    };

    const updated = await prisma.patientVital.update({
        where: { id },
        data: {
            heightCm: parseNum(body.heightCm),
            weightKg: parseNum(body.weightKg),
            systolicBp: parseNum(body.systolicBp)?.valueOf() ?? null,
            diastolicBp: parseNum(body.diastolicBp)?.valueOf() ?? null,
            pulseBpm: parseNum(body.pulseBpm)?.valueOf() ?? null,
            spo2Percent: parseNum(body.spo2Percent)?.valueOf() ?? null,
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

    const existing = await prisma.patientVital.findFirst({ where: { id, patientId: auth.patientId } });
    if (!existing) return NextResponse.json({ error: "Vital not found" }, { status: 404 });

    await prisma.patientVital.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
