import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function calculateAge(dob: Date) {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age -= 1;
    }
    return age;
}

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "PATIENT") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const patient = await prisma.patient.findUnique({
        where: { userId },
        include: {
            user: {
                select: { name: true, email: true },
            },
        },
    });

    if (!patient) {
        return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const healthMetricsRows = await prisma.$queryRaw<Array<{ heightCm: number | null; weightKg: number | null }>>(Prisma.sql`
        SELECT "heightCm", "weightKg"
        FROM "Patient"
        WHERE "userId" = ${userId}
        LIMIT 1
    `);
    const healthMetrics = healthMetricsRows[0] ?? { heightCm: null, weightKg: null };

    return NextResponse.json({
        name: patient.user.name,
        email: patient.user.email,
        universalId: patient.universalId,
        dob: patient.dob,
        age: calculateAge(patient.dob),
        phone: patient.phone,
        address: patient.address,
        heightCm: healthMetrics.heightCm,
        weightKg: healthMetrics.weightKg,
    });
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "PATIENT") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const dobValue = typeof body.dob === "string" ? body.dob.trim() : "";
    const heightCm = body.heightCm === "" || body.heightCm == null ? null : Number(body.heightCm);
    const weightKg = body.weightKg === "" || body.weightKg == null ? null : Number(body.weightKg);

    if (!dobValue) {
        return NextResponse.json({ error: "Date of birth is required" }, { status: 400 });
    }

    const dob = new Date(dobValue);
    if (Number.isNaN(dob.getTime())) {
        return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 });
    }

    if (heightCm != null && (!Number.isFinite(heightCm) || heightCm <= 0 || heightCm > 300)) {
        return NextResponse.json({ error: "Height must be between 1 and 300 cm" }, { status: 400 });
    }

    if (weightKg != null && (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 500)) {
        return NextResponse.json({ error: "Weight must be between 1 and 500 kg" }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const updated = await prisma.patient.update({
        where: { userId },
        data: {
            dob,
        },
    });

    await prisma.$executeRaw(Prisma.sql`
        UPDATE "Patient"
        SET "heightCm" = ${heightCm}, "weightKg" = ${weightKg}
        WHERE "userId" = ${userId}
    `);

    return NextResponse.json({
        dob: updated.dob,
        age: calculateAge(updated.dob),
        heightCm,
        weightKg,
    });
}
