import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MedicationAdherenceStatus } from "@prisma/client";
import { getPatientAuthContext } from "../../_utils";

export async function GET(req: Request) {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const url = new URL(req.url);
    const scheduleId = url.searchParams.get("scheduleId");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const rows = await prisma.medicationAdherenceLog.findMany({
        where: {
            patientId: auth.patientId,
            ...(scheduleId ? { scheduleId } : {}),
            ...(from || to
                ? {
                    scheduledFor: {
                        ...(from ? { gte: new Date(from) } : {}),
                        ...(to ? { lte: new Date(to) } : {}),
                    },
                }
                : {}),
        },
        orderBy: { scheduledFor: "desc" },
        take: 300,
    });
    return NextResponse.json(rows);
}

export async function POST(req: Request) {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const body = await req.json();
    const scheduleId = String(body.scheduleId || "").trim();
    if (!scheduleId) return NextResponse.json({ error: "scheduleId is required" }, { status: 400 });
    const schedule = await prisma.medicationSchedule.findFirst({
        where: { id: scheduleId, patientId: auth.patientId },
        select: { id: true },
    });
    if (!schedule) return NextResponse.json({ error: "Schedule not found" }, { status: 404 });

    const status = Object.values(MedicationAdherenceStatus).includes(body.status)
        ? (body.status as MedicationAdherenceStatus)
        : MedicationAdherenceStatus.PENDING;
    const takenAt = status === MedicationAdherenceStatus.TAKEN
        ? (body.takenAt ? new Date(body.takenAt) : new Date())
        : null;

    const created = await prisma.medicationAdherenceLog.create({
        data: {
            patientId: auth.patientId,
            scheduleId,
            scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : new Date(),
            status,
            takenAt,
            notes: typeof body.notes === "string" ? body.notes.trim() : null,
            source: typeof body.source === "string" ? body.source.trim() : "manual",
        },
    });
    return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: Request) {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const existing = await prisma.medicationAdherenceLog.findFirst({
        where: { id, patientId: auth.patientId },
    });
    if (!existing) return NextResponse.json({ error: "Log not found" }, { status: 404 });
    const body = await req.json();
    const status = Object.values(MedicationAdherenceStatus).includes(body.status)
        ? (body.status as MedicationAdherenceStatus)
        : existing.status;

    const updated = await prisma.medicationAdherenceLog.update({
        where: { id },
        data: {
            status,
            takenAt: status === MedicationAdherenceStatus.TAKEN
                ? (body.takenAt ? new Date(body.takenAt) : existing.takenAt || new Date())
                : null,
            notes: typeof body.notes === "string" ? body.notes.trim() : existing.notes,
        },
    });
    return NextResponse.json(updated);
}
