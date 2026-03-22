import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // CRITICAL: Force refresh the singleton if it's stale (missing 'medicine' model)
    if (!(prisma as any).medicine) {
        console.log("Prisma Client is stale, forcing refresh...");
        (globalThis as any).prisma = undefined;
        // Re-importing or re-calculating the singleton would happen on the next access
        // However, since we just imported 'prisma' above, we might need to locally re-instantiate
    }

    try {
        console.log("Medicine API query:", query);
        // Ensure "Paracetamol" exists (minimal seeding)
        // Using casting to bypass potential stale type issues in dev server
        await (prisma as any).medicine.upsert({
            where: { name: "Paracetamol" },
            update: {},
            create: { name: "Paracetamol" }
        });

        const medicines = await (prisma as any).medicine.findMany({
            where: {
                name: {
                    contains: query,
                    mode: "insensitive"
                }
            },
            take: 10
        });

        console.log("Found medicines:", medicines.length);
        return NextResponse.json(medicines);
    } catch (error: any) {
        console.error("MEDICINES_GET_ERROR:", error.message, error.stack);
        return NextResponse.json({ error: "Internal error", details: error.message }, { status: 500 });
    }
}
