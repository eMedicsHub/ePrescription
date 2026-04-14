import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const denialReason = body.reason || "Denied by administrator";

    try {
        const result = await prisma.user.updateMany({
            where: {
                id,
                isApproved: false,
                role: {
                    in: ["DOCTOR", "PHARMACIST"],
                },
            },
            data: {
                denialReason,
            },
        });

        if (result.count === 0) {
            return NextResponse.json({ error: "Registration not found or already processed" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Registration denied" });
    } catch (error) {
        console.error("[Deny Registration]", error);
        return NextResponse.json({ error: "Failed to deny registration" }, { status: 500 });
    }
}
