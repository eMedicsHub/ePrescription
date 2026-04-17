import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || (session.user as any).role !== "PATIENT") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!(prisma as any).patientRecord || !(prisma as any).consent || !(prisma as any).prescription) {
            console.warn("PATIENT_TIMELINE_WARN stale Prisma client detected");
            return NextResponse.json([]);
        }

        const userId = (session.user as any).id;
        const patient = await prisma.patient.findUnique({ where: { userId } });
        if (!patient) {
            return NextResponse.json([]);
        }

        const [prescriptions, records, consents] = await Promise.all([
            (prisma as any).prescription.findMany({
                where: { patientId: patient.id },
                include: {
                    doctor: { select: { id: true, name: true, email: true } },
                    medications: true,
                },
                orderBy: { createdAt: "desc" },
            }),
            (prisma as any).patientRecord.findMany({
                where: { patientId: patient.id },
                include: {
                    doctor: { select: { id: true, name: true, email: true } },
                    createdBy: { select: { id: true, name: true, role: true } },
                },
                orderBy: { occurredAt: "desc" },
            }),
            (prisma as any).consent.findMany({
                where: { patientId: patient.id },
                include: {
                    doctor: { select: { id: true, name: true, email: true } },
                },
                orderBy: { createdAt: "desc" },
            }),
        ]);

        const timeline = [
            ...prescriptions.map((prescription: any) => ({
                id: `prescription-${prescription.id}`,
                kind: "PRESCRIPTION",
                occurredAt: prescription.createdAt,
                title: `Prescription issued by ${prescription.doctor.name}`,
                summary: `${prescription.medications.length} medication(s) - ${prescription.status}`,
                doctor: prescription.doctor,
                payload: prescription,
            })),
            ...records.map((record: any) => ({
                id: `record-${record.id}`,
                kind: "RECORD",
                occurredAt: record.occurredAt,
                title: record.title,
                summary: `${record.category.replaceAll("_", " ")} - Added from ${record.sourcePortal.toLowerCase()} portal`,
                doctor: record.doctor,
                payload: record,
            })),
            ...consents.map((consent: any) => ({
                id: `consent-${consent.id}`,
                kind: "ACCESS_GRANTED",
                occurredAt: consent.createdAt,
                title: `Doctor access granted to ${consent.doctor.name}`,
                summary: consent.doctor.email,
                doctor: consent.doctor,
                payload: consent,
            })),
        ].sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());

        return NextResponse.json(timeline);
    } catch (error) {
        console.error("PATIENT_TIMELINE_ERROR", error);
        return NextResponse.json({ error: "Failed to load timeline" }, { status: 500 });
    }
}
