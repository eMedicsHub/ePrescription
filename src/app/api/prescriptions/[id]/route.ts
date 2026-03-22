import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    const { status } = await req.json();

    if (!session ||
        (!((session.user as any).role === "PHARMACIST" && status === "DISPENSED") &&
            !((session.user as any).role === "DOCTOR" && status === "CANCELLED"))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const prescription = await (prisma as any).prescription.update({
            where: { id },
            data: { status }
        });

        return NextResponse.json(prescription);
    } catch (error) {
        console.error("PRESCRIPTION_PATCH_ERROR", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
