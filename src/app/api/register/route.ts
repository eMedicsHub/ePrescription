import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
    try {
        const { email, password, name, role } = await req.json();

        if (!email || !password || !name || !role) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        // disallow elevated roles through public registration
        if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return NextResponse.json({ error: "Email already exists" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role,
                ...(role === "PATIENT" && {
                    patientProfile: {
                        create: {
                            dob: new Date(),
                            address: "",
                            phone: ""
                        }
                    }
                })
            }
        });


        return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (error: any) {
        console.error("REGISTRATION_ERROR", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
