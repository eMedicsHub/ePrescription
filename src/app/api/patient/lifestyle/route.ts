import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPatientAuthContext } from "../_utils";

export async function GET() {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const row = await prisma.patientLifestyleProfile.findUnique({
        where: { patientId: auth.patientId },
    });
    return NextResponse.json(row);
}

export async function PUT(req: Request) {
    const auth = await getPatientAuthContext();
    if (auth.error) return auth.error;
    const body = await req.json();

    const profile = await prisma.patientLifestyleProfile.upsert({
        where: { patientId: auth.patientId },
        create: {
            patientId: auth.patientId,
            smokingStatus: typeof body.smokingStatus === "string" ? body.smokingStatus.trim() : null,
            alcoholUse: typeof body.alcoholUse === "string" ? body.alcoholUse.trim() : null,
            activityLevel: typeof body.activityLevel === "string" ? body.activityLevel.trim() : null,
            dietPreference: typeof body.dietPreference === "string" ? body.dietPreference.trim() : null,
            sleepHours: body.sleepHours === "" || body.sleepHours == null ? null : Number(body.sleepHours),
            stressLevel: typeof body.stressLevel === "string" ? body.stressLevel.trim() : null,
        },
        update: {
            smokingStatus: typeof body.smokingStatus === "string" ? body.smokingStatus.trim() : undefined,
            alcoholUse: typeof body.alcoholUse === "string" ? body.alcoholUse.trim() : undefined,
            activityLevel: typeof body.activityLevel === "string" ? body.activityLevel.trim() : undefined,
            dietPreference: typeof body.dietPreference === "string" ? body.dietPreference.trim() : undefined,
            sleepHours: body.sleepHours === "" || body.sleepHours == null ? null : Number(body.sleepHours),
            stressLevel: typeof body.stressLevel === "string" ? body.stressLevel.trim() : undefined,
        },
    });

    return NextResponse.json(profile);
}
