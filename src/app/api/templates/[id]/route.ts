import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PUT /api/templates/[id] — update template name and medications
export async function PUT(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "DOCTOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doctorId = (session.user as any).id;
    const { id } = await params;

    try {
        // Ownership check
        const existing = await (prisma as any).prescriptionTemplate.findUnique({
            where: { id },
        });
        if (!existing || existing.doctorId !== doctorId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const { name, medications } = await req.json();

        if (!name?.trim()) {
            return NextResponse.json({ error: "Template name is required" }, { status: 400 });
        }
        if (!Array.isArray(medications) || medications.length === 0) {
            return NextResponse.json({ error: "At least one medication is required" }, { status: 400 });
        }

        // Delete old medications and recreate (simplest approach given Cascade)
        await (prisma as any).templateMedication.deleteMany({ where: { templateId: id } });

        const updated = await (prisma as any).prescriptionTemplate.update({
            where: { id },
            data: {
                name: name.trim(),
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

        return NextResponse.json(updated);
    } catch (error) {
        console.error("TEMPLATES_PUT_ERROR", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

// DELETE /api/templates/[id] — delete a template (doctor-scoped)
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "DOCTOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doctorId = (session.user as any).id;
    const { id } = await params;

    try {
        const existing = await (prisma as any).prescriptionTemplate.findUnique({
            where: { id },
        });
        if (!existing || existing.doctorId !== doctorId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        await (prisma as any).prescriptionTemplate.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("TEMPLATES_DELETE_ERROR", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
