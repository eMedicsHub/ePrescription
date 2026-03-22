import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "DOCTOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { patientId, medications, notes, expiresAt } = await req.json();

        if (!patientId || !medications || medications.length === 0) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const prescription = await (prisma as any).prescription.create({
            data: {
                patientId,
                doctorId: (session.user as any).id,
                notes,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                medications: {
                    create: medications.map((m: any) => ({
                        name: m.name,
                        dosage: m.dosage,
                        frequency: m.frequency,
                        duration: m.duration
                    }))
                }
            },
            include: {
                medications: true
            }
        });

        return NextResponse.json(prescription);
    } catch (error) {
        console.error("PRESCRIPTION_POST_ERROR", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const doctorId = searchParams.get("doctorId");
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const isDoctor = (session.user as any).role === "DOCTOR";
        const userId = (session.user as any).id;

        // If the doctor is requesting prescriptions for a specific patient,
        // we must check if they have explicit consent. If not, they can only view 
        // the ones they prescribed themselves.
        let doctorVisibilityCondition = {};
        if (isDoctor && patientId) {
            const hasConsent = await (prisma as any).consent.findUnique({
                where: {
                    patientId_doctorId: {
                        patientId: patientId,
                        doctorId: userId
                    }
                }
            });

            if (!hasConsent) {
                // If no consent, force doctorId to the calling user to only show their own records
                // instead of all records for that patient.
                doctorVisibilityCondition = { doctorId: userId };
            }
        }

        const prescriptions = await (prisma as any).prescription.findMany({
            where: {
                ...(patientId && { patientId }),
                ...(doctorId && { doctorId }),
                // @ts-ignore
                ...(session.user.role === "PATIENT" && { patient: { userId: (session.user as any).id } }),
                // @ts-ignore
                ...(session.user.role === "DOCTOR" && !doctorId && !patientId && { doctorId: (session.user as any).id }),
                ...doctorVisibilityCondition
            },
            include: {
                patient: { include: { user: true } },
                doctor: true,
                medications: true
            },
            orderBy: { createdAt: "desc" }
        });

        // Auto-expire logic on read
        const now = new Date();
        const updatedPrescriptions = await Promise.all(prescriptions.map(async (p: any) => {
            if (p.status === 'PENDING' && p.expiresAt && new Date(p.expiresAt) < now) {
                // Update in background
                await (prisma as any).prescription.update({
                    where: { id: p.id },
                    data: { status: 'EXPIRED' }
                });
                return { ...p, status: 'EXPIRED' };
            }
            return p;
        }));

        return NextResponse.json(updatedPrescriptions);
    } catch (error) {
        console.error("PRESCRIPTION_GET_ERROR", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
