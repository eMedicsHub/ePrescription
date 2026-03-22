import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "PATIENT") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        if (!(prisma as any).consent) {
            console.log("Prisma Client is stale, forgetting singleton...");
            (globalThis as any).prisma = undefined;
        }

        const userId = (session.user as any).id;
        const patient = await (prisma as any).patient.findUnique({
            where: { userId }
        });

        if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

        const consents = await (prisma as any).consent.findMany({
            where: {
                patientId: patient.id
            },
            include: {
                doctor: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(consents);
    } catch (error) {
        console.error("CONSENT_GET_ERROR", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "PATIENT") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        if (!(prisma as any).consent) {
            console.log("Prisma Client is stale, forgetting singleton...");
            (globalThis as any).prisma = undefined;
        }

        const { doctorId } = await req.json();
        if (!doctorId) {
            return NextResponse.json({ error: "Missing doctorId" }, { status: 400 });
        }

        const userId = (session.user as any).id;
        const patient = await (prisma as any).patient.findUnique({
            where: { userId }
        });

        if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

        const consent = await (prisma as any).consent.create({
            data: {
                patientId: patient.id,
                doctorId: doctorId
            },
            include: {
                doctor: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        return NextResponse.json(consent);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "Consent already exists" }, { status: 400 });
        }
        console.error("CONSENT_POST_ERROR", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "PATIENT") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        if (!(prisma as any).consent) {
            console.log("Prisma Client is stale, forgetting singleton...");
            (globalThis as any).prisma = undefined;
        }

        const { searchParams } = new URL(req.url);
        const consentId = searchParams.get("id");

        if (!consentId) {
            return NextResponse.json({ error: "Missing consent id" }, { status: 400 });
        }

        const userId = (session.user as any).id;
        const patient = await (prisma as any).patient.findUnique({
            where: { userId }
        });

        if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

        // Ensure the consent belongs to the patient attempting to delete it
        const consent = await (prisma as any).consent.findUnique({
            where: { id: consentId }
        })

        if (!consent || consent.patientId !== patient.id) {
            return NextResponse.json({ error: "Consent not found or unauthorized" }, { status: 404 });
        }

        await (prisma as any).consent.delete({
            where: { id: consentId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("CONSENT_DELETE_ERROR", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
