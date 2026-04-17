import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PatientCarePlanStatus } from "@prisma/client";
import { getPatientAuthContext } from "../_utils";

export async function GET() {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const rows = await prisma.patientCarePlan.findMany({
        where: { patientId: auth.patientId },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(rows);
}

export async function POST(req: Request) {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const body = await req.json();
    const title = String(body.title || "").trim();
    if (!title) return NextResponse.json({ error: "Plan title is required" }, { status: 400 });
    const status = Object.values(PatientCarePlanStatus).includes(body.status)
        ? (body.status as PatientCarePlanStatus)
        : PatientCarePlanStatus.ACTIVE;

    const created = await prisma.patientCarePlan.create({
        data: {
            patientId: auth.patientId,
            title,
            goal: typeof body.goal === "string" ? body.goal.trim() : null,
            status,
            startedAt: body.startedAt ? new Date(body.startedAt) : null,
            targetReviewAt: body.targetReviewAt ? new Date(body.targetReviewAt) : null,
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
    const existing = await prisma.patientCarePlan.findFirst({ where: { id, patientId: auth.patientId } });
    if (!existing) return NextResponse.json({ error: "Care plan not found" }, { status: 404 });
    const body = await req.json();
    const status = Object.values(PatientCarePlanStatus).includes(body.status)
        ? (body.status as PatientCarePlanStatus)
        : existing.status;

    const updated = await prisma.patientCarePlan.update({
        where: { id },
        data: {
            title: typeof body.title === "string" ? body.title.trim() : existing.title,
            goal: typeof body.goal === "string" ? body.goal.trim() : existing.goal,
            status,
            startedAt: body.startedAt ? new Date(body.startedAt) : existing.startedAt,
            targetReviewAt: body.targetReviewAt ? new Date(body.targetReviewAt) : existing.targetReviewAt,
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
    const existing = await prisma.patientCarePlan.findFirst({ where: { id, patientId: auth.patientId } });
    if (!existing) return NextResponse.json({ error: "Care plan not found" }, { status: 404 });
    await prisma.patientCarePlan.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
