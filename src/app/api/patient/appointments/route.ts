import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AppointmentStatus, AppointmentType, ReminderChannel, ReminderStatus, Role } from "@prisma/client";
import { getPatientAuthContext } from "../_utils";

function buildReminderTimes(appointmentAt: Date, offsets: number[]) {
    return offsets
        .filter((m) => Number.isFinite(m) && m > 0)
        .map((m) => new Date(appointmentAt.getTime() - m * 60 * 1000))
        .filter((d) => d.getTime() > Date.now());
}

export async function GET(req: Request) {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const from = new URL(req.url).searchParams.get("from");
    const to = new URL(req.url).searchParams.get("to");
    const rows = await prisma.appointment.findMany({
        where: {
            patientId: auth.patientId,
            ...(from || to ? { appointmentAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
        },
        include: {
            doctorUser: { select: { id: true, name: true, email: true } },
            reminders: true,
        },
        orderBy: { appointmentAt: "asc" },
    });
    return NextResponse.json(rows);
}

export async function POST(req: Request) {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const body = await req.json();
    const title = String(body.title || "").trim();
    if (!title || !body.appointmentAt) return NextResponse.json({ error: "title and appointmentAt are required" }, { status: 400 });
    const appointmentAt = new Date(body.appointmentAt);
    if (Number.isNaN(appointmentAt.getTime())) return NextResponse.json({ error: "Invalid appointmentAt" }, { status: 400 });
    const type = Object.values(AppointmentType).includes(body.type) ? body.type as AppointmentType : AppointmentType.CONSULTATION;
    const status = Object.values(AppointmentStatus).includes(body.status) ? body.status as AppointmentStatus : AppointmentStatus.SCHEDULED;
    let doctorUserId: string | null = body.doctorUserId || null;
    if (doctorUserId) {
        const doctor = await prisma.user.findFirst({ where: { id: doctorUserId, role: Role.DOCTOR }, select: { id: true } });
        if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }
    const reminderOffsetMins = Array.isArray(body.reminderOffsetMins) ? body.reminderOffsetMins.map((x: unknown) => Number(x)) : [1440, 120];
    const reminderTimes = buildReminderTimes(appointmentAt, reminderOffsetMins);

    const created = await prisma.appointment.create({
        data: {
            patientId: auth.patientId,
            doctorUserId,
            title,
            type,
            status,
            appointmentAt,
            durationMinutes: body.durationMinutes ? Number(body.durationMinutes) : null,
            location: typeof body.location === "string" ? body.location.trim() : null,
            visitNotes: typeof body.visitNotes === "string" ? body.visitNotes.trim() : null,
            followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
            reminderOffsetMins,
            reminders: {
                create: reminderTimes.map((reminderAt) => ({
                    patientId: auth.patientId,
                    reminderAt,
                    channel: ReminderChannel.IN_APP,
                    status: ReminderStatus.PENDING,
                })),
            },
        },
        include: { reminders: true, doctorUser: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: Request) {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const existing = await prisma.appointment.findFirst({ where: { id, patientId: auth.patientId } });
    if (!existing) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    const body = await req.json();
    const status = Object.values(AppointmentStatus).includes(body.status) ? body.status as AppointmentStatus : existing.status;
    const updated = await prisma.appointment.update({
        where: { id },
        data: {
            title: typeof body.title === "string" ? body.title.trim() : existing.title,
            status,
            appointmentAt: body.appointmentAt ? new Date(body.appointmentAt) : existing.appointmentAt,
            location: typeof body.location === "string" ? body.location.trim() : existing.location,
            visitNotes: typeof body.visitNotes === "string" ? body.visitNotes.trim() : existing.visitNotes,
            followUpDate: body.followUpDate ? new Date(body.followUpDate) : existing.followUpDate,
        },
        include: { reminders: true, doctorUser: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const existing = await prisma.appointment.findFirst({ where: { id, patientId: auth.patientId } });
    if (!existing) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    await prisma.appointment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
