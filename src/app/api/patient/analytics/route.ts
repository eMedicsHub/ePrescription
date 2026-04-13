import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "PATIENT") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) {
        return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const [prescriptions, records, consents] = await Promise.all([
        (prisma as any).prescription.findMany({ where: { patientId: patient.id }, include: { doctor: true } }),
        (prisma as any).patientRecord.findMany({ where: { patientId: patient.id } }),
        (prisma as any).consent.findMany({ where: { patientId: patient.id } }),
    ]);

    const statusCounts = prescriptions.reduce((acc: Record<string, number>, prescription: any) => {
        acc[prescription.status] = (acc[prescription.status] || 0) + 1;
        return acc;
    }, {});

    const categoryCounts = records.reduce((acc: Record<string, number>, record: any) => {
        acc[record.category] = (acc[record.category] || 0) + 1;
        return acc;
    }, {});

    const totalMedicalBills = records.reduce((acc: number, record: any) => {
        if (record.category !== "MEDICAL_BILL" || !record.amount) {
            return acc;
        }

        return acc + Number(record.amount);
    }, 0);

    const activeDoctorCount = new Set(consents.map((consent: any) => consent.doctorId)).size;
    const expiringSoon = prescriptions.filter((prescription: any) => {
        if (!prescription.expiresAt || prescription.status !== "PENDING") {
            return false;
        }

        const daysUntilExpiry = (new Date(prescription.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry >= 0 && daysUntilExpiry <= 14;
    }).length;

    return NextResponse.json({
        prescriptionCount: prescriptions.length,
        statusCounts,
        categoryCounts,
        totalMedicalBills,
        activeDoctorCount,
        expiringSoon,
    });
}