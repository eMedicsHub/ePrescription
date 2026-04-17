import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: RouteContext) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    const result = await prisma.user.updateMany({
        where: {
            id,
            isApproved: false,
            role: {
                in: ["DOCTOR", "PHARMACIST", "PATIENT"],
            },
        },
        data: {
            isApproved: true,
            denialReason: null,
        },
    });

    if (result.count === 0) {
        return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
}
