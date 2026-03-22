import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "PATIENT") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    try {
        const doctors = await prisma.user.findMany({
            where: {
                role: "DOCTOR",
                OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } }
                ]
            },
            select: {
                id: true,
                name: true,
                email: true
            },
            take: 10
        });

        return NextResponse.json(doctors);
    } catch (error) {
        console.error("DOCTOR_GET_ERROR", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
