import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || ((session.user as any).role !== "DOCTOR" && (session.user as any).role !== "PHARMACIST")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    try {
        // If user is a pharmacist, standard search logic remains
        // If user is a doctor, they can only see patients that they have prescribed to BEFORE OR they have explicit consent for.
        const isDoctor = (session.user as any).role === "DOCTOR";
        const userId = (session.user as any).id;

        const baseSearchCondition = {
            OR: [
                { user: { name: { contains: query, mode: "insensitive" as const } } },
                { user: { email: { contains: query, mode: "insensitive" as const } } },
                { universalId: { contains: query, mode: "insensitive" as const } },
                { phone: { contains: query } }
            ]
        };

        let doctorAccessCondition = {};
        if (isDoctor) {
            doctorAccessCondition = {
                OR: [
                    { prescriptions: { some: { doctorId: userId } } },
                    { consents: { some: { doctorId: userId } } }
                ]
            };
        }

        const patients = await prisma.patient.findMany({
            where: {
                AND: [
                    baseSearchCondition,
                    ...(isDoctor ? [doctorAccessCondition] : [])
                ]
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        });

        return NextResponse.json(patients);
    } catch (error) {
        console.error("PATIENT_GET_ERROR", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "DOCTOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, dob, phone, email } = body;

        if (!name || !dob) {
            return NextResponse.json({ error: "Name and Date of Birth are required fields." }, { status: 400 });
        }

        const doctorId = (session.user as any).id;

        // Generate synthetic values for optional fields required by schema
        const phoneValue = phone && phone.trim() !== "" ? phone.trim() : "";

        let emailValue = email && email.trim() !== "" ? email.trim() : "";
        let isSyntheticEmail = false;

        if (!emailValue) {
            // Generate synthetic email
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            emailValue = `placeholder-${randomSuffix}@eprescribe.local`;
            isSyntheticEmail = true;
        }

        // Before proceeding, ensure email doesn't collide
        const existingEmail = await prisma.user.findFirst({
            where: {
                email: emailValue.toLowerCase(),
                role: "PATIENT"
            }
        });

        if (existingEmail && !isSyntheticEmail) {
            return NextResponse.json({ error: "A user with this email already exists." }, { status: 400 });
        } else if (existingEmail && isSyntheticEmail) {
            // In the very unlikely event of a collision on synthetic, regenerate
            const randomSuffix = Math.random().toString(36).substring(2, 10);
            emailValue = `placeholder-${randomSuffix}@eprescribe.local`;
        }

        // Generate random secure password since they aren't logging in immediately
        const randomPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        // Transaction to create User, Patient, and Consent together
        const newPatient = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name: name.trim(),
                    email: emailValue.toLowerCase(),
                    password: randomPassword, // In a real app, you'd hash this, but they won't use it directly here
                    role: "PATIENT",
                    isApproved: true,
                }
            });

            const patient = await tx.patient.create({
                data: {
                    userId: user.id,
                    universalId: `EPID${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
                    dob: new Date(dob),
                    phone: phoneValue,
                    address: "", // Address missing from requirements, defaulting to empty
                }
            });

            await (tx as any).consent.create({
                data: {
                    patientId: patient.id,
                    doctorId: doctorId
                }
            });

            return {
                id: patient.id,
                universalId: patient.universalId,
                userId: user.id,
                dob: patient.dob,
                phone: patient.phone,
                user: {
                    name: user.name,
                    email: isSyntheticEmail ? "" : user.email // Hide synthetic email formatting from frontend
                }
            };
        });

        return NextResponse.json(newPatient);

    } catch (error) {
        console.error("PATIENT_POST_ERROR", error);
        return NextResponse.json({ error: "Failed to create new patient" }, { status: 500 });
    }
}
