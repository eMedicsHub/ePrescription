import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function POST(req: Request, context: RouteContext) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const newRole = body?.role as string | undefined;

    if (!newRole || (newRole !== "ADMIN" && newRole !== "SUPER_ADMIN")) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    try {
        const updated = await prisma.admin.update({
            where: { id },
            data: { role: newRole as any },
            select: { id: true, name: true, email: true, role: true },
        });

        return NextResponse.json({ success: true, user: updated });
    } catch (e: any) {
        return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
    }
}
