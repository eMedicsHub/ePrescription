import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/templates — list all templates for the current doctor
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "DOCTOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doctorId = (session.user as any).id;

    try {
        const templates = await (prisma as any).prescriptionTemplate.findMany({
            where: { doctorId },
            include: { medications: true },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(templates);
    } catch (error) {
        console.error("TEMPLATES_GET_ERROR", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

// POST /api/templates — create a new template
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "DOCTOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doctorId = (session.user as any).id;

    try {
        const { name, medications } = await req.json();

        if (!name?.trim()) {
            return NextResponse.json({ error: "Template name is required" }, { status: 400 });
        }
        if (!Array.isArray(medications) || medications.length === 0) {
            return NextResponse.json({ error: "At least one medication is required" }, { status: 400 });
        }

        const template = await (prisma as any).prescriptionTemplate.create({
            data: {
                name: name.trim(),
                doctorId,
                medications: {
                    create: medications.map((m: any) => ({
                        name: m.name,
                        dosage: m.dosage,
                        frequency: m.frequency,
                        duration: m.duration,
                    })),
                },
            },
            include: { medications: true },
        });

        return NextResponse.json(template, { status: 201 });
    } catch (error) {
        console.error("TEMPLATES_POST_ERROR", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
