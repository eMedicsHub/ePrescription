import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            name: true,
            email: true,
            role: true,
            patientProfile: {
                select: {
                    phone: true,
                    address: true,
                },
            },
        },
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
        name: user.name,
        email: user.email,
        role: user.role,
        phone: role === "PATIENT" ? user.patientProfile?.phone ?? "" : "",
        address: role === "PATIENT" ? user.patientProfile?.address ?? "" : "",
    });
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";

    if (!name) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    await prisma.user.update({
        where: { id: userId },
        data: { name },
    });

    if (role === "PATIENT") {
        await prisma.patient.update({
            where: { userId },
            data: {
                phone,
                address,
            },
        });
    }

    return NextResponse.json({ success: true });
}
