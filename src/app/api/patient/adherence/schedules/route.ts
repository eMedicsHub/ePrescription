import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MedicationScheduleStatus } from "@prisma/client";
import { getPatientAuthContext } from "../../_utils";

export async function GET() {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const rows = await prisma.medicationSchedule.findMany({
        where: { patientId: auth.patientId },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(rows);
}

export async function POST(req: Request) {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const body = await req.json();
    const medicationName = String(body.medicationName || "").trim();
    const frequency = String(body.frequency || "").trim();
    if (!medicationName || !frequency) {
        return NextResponse.json({ error: "medicationName and frequency are required" }, { status: 400 });
    }
    const status = Object.values(MedicationScheduleStatus).includes(body.status)
        ? (body.status as MedicationScheduleStatus)
        : MedicationScheduleStatus.ACTIVE;
    const reminderTimes = Array.isArray(body.reminderTimes) ? body.reminderTimes.map((v: unknown) => String(v)) : [];

    const created = await prisma.medicationSchedule.create({
        data: {
            patientId: auth.patientId,
            prescriptionId: body.prescriptionId || null,
            medicationId: body.medicationId || null,
            medicationName,
            dosage: typeof body.dosage === "string" ? body.dosage.trim() : null,
            instruction: typeof body.instruction === "string" ? body.instruction.trim() : null,
            frequency,
            timesPerDay: Number(body.timesPerDay || 1),
            reminderTimes,
            startDate: body.startDate ? new Date(body.startDate) : null,
            endDate: body.endDate ? new Date(body.endDate) : null,
            status,
        },
    });
    return NextResponse.json(created, { status: 201 });
}
