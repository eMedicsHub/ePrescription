import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

function computeExpiry(days?: number) {
    if (!days || Number.isNaN(days) || days <= 0) {
        return null;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    return expiresAt;
}

function isExpired(consent: any) {
    return consent.expiresAt && new Date(consent.expiresAt) < new Date();
}

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

        const rawConsents = await (prisma as any).consent.findMany({
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

        const expiredIds = rawConsents
            .filter((consent: any) => consent.status === "ACTIVE" && isExpired(consent))
            .map((consent: any) => consent.id);

        if (expiredIds.length > 0) {
            await (prisma as any).consent.updateMany({
                where: { id: { in: expiredIds } },
                data: { status: "EXPIRED" },
            });
        }

        const consents = rawConsents
            .map((consent: any) => {
                if (expiredIds.includes(consent.id)) {
                    return { ...consent, status: "EXPIRED" };
                }

                return consent;
            })
            .filter((consent: any) => consent.status === "ACTIVE");

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

        const { doctorId, durationDays } = await req.json();
        if (!doctorId) {
            return NextResponse.json({ error: "Missing doctorId" }, { status: 400 });
        }

        const userId = (session.user as any).id;
        const patient = await (prisma as any).patient.findUnique({
            where: { userId }
        });

        if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

        const expiresAt = computeExpiry(typeof durationDays === "number" ? durationDays : 30);

        const consent = await (prisma as any).consent.upsert({
            where: {
                patientId_doctorId: {
                    patientId: patient.id,
                    doctorId,
                },
            },
            update: {
                status: "ACTIVE",
                expiresAt,
                revokedAt: null,
            },
            create: {
                patientId: patient.id,
                doctorId,
                status: "ACTIVE",
                expiresAt,
            },
            include: {
                doctor: {
                    select: { id: true, name: true, email: true }
                }
            },
        });

        return NextResponse.json(consent);
    } catch (error: any) {
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

        await (prisma as any).consent.update({
            where: { id: consentId },
            data: {
                status: "REVOKED",
                revokedAt: new Date(),
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("CONSENT_DELETE_ERROR", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
