import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { appLog } from "@/lib/logger";

export async function getPatientAuthContext() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "PATIENT") {
        appLog("warn", "Unauthorized patient API access attempt");
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    const userId = (session.user as any).id as string;
    const patient = await prisma.patient.findUnique({ where: { userId }, select: { id: true } });
    if (!patient) {
        appLog("warn", "Patient profile missing for authenticated user", { userId });
        return { error: NextResponse.json({ error: "Patient not found" }, { status: 404 }) };
    }

    return { patientId: patient.id, userId };
}
