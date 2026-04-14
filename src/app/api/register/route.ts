import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
    try {
        const { email, password, name, role } = await req.json();
        const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
        const normalizedName = typeof name === "string" ? name.trim() : "";
        const allowedRoles = new Set(["DOCTOR", "PHARMACIST", "PATIENT"]);

        if (!normalizedEmail || !password || !normalizedName || !role) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        if (typeof password !== "string" || password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }

        // allow only public roles through public registration
        if (!allowedRoles.has(role)) {
            return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                email: normalizedEmail,
                role,
            }
        });

        if (existingUser) {
            return NextResponse.json({ error: `An account already exists for this ${role.toLowerCase()} account.` }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const needsAdminApproval = role === "DOCTOR" || role === "PHARMACIST";
        const isApproved = !needsAdminApproval;

        const user = await prisma.user.create({
            data: {
                email: normalizedEmail,
                password: hashedPassword,
                name: normalizedName,
                role,
                isApproved,
                ...(role === "PATIENT" && {
                    patientProfile: {
                        create: {
                            universalId: `EPID${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
                            dob: new Date(),
                            address: "",
                            phone: ""
                        }
                    }
                })
            }
        });


        return NextResponse.json({
            message: isApproved
                ? "Registration successful."
                : "Registration submitted. An admin must approve your account before you can log in.",
            user: { id: user.id, email: user.email, name: user.name, role: user.role, isApproved: user.isApproved }
        });
    } catch (error: any) {
        console.error("REGISTRATION_ERROR", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
