import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { AdminRole, Role } from "@prisma/client";

const googleProviderRoleMap: Record<string, Role> = {
    "google-patient": "PATIENT",
    "google-doctor": "DOCTOR",
    "google-pharmacist": "PHARMACIST",
};

type AppRole = Role | AdminRole;

const providers: NextAuthOptions["providers"] = [
    CredentialsProvider({
        name: "credentials",
        credentials: {
            identifier: { label: "Email or Username", type: "text" },
            password: { label: "Password", type: "password" },
            portalRole: { label: "Portal Role", type: "text" },
        },
        async authorize(credentials) {
            const identifier = credentials?.identifier?.trim();
            const rawPassword = credentials?.password;
            const portalRole = credentials?.portalRole as AppRole | undefined;

            if (!identifier || !rawPassword) {
                throw new Error("Invalid credentials");
            }

            const normalizedIdentifier = identifier.toLowerCase();
            let user: { id: string; email: string; password: string; role: AppRole } | null = null;

            if (portalRole === "ADMIN" || portalRole === "SUPER_ADMIN") {
                user = await prisma.admin.findFirst({
                    where: {
                        email: normalizedIdentifier,
                        role: portalRole,
                    },
                    select: { id: true, email: true, password: true, role: true },
                });
            } else if (portalRole) {
                user = await prisma.user.findFirst({
                    where: {
                        email: normalizedIdentifier,
                        role: portalRole as Role,
                    },
                    select: { id: true, email: true, password: true, role: true },
                });
            } else {
                const matchingUsers = await prisma.user.findMany({
                    where: {
                        email: normalizedIdentifier,
                        role: {
                            in: ["PATIENT", "DOCTOR", "PHARMACIST"],
                        },
                    },
                    take: 2,
                    select: { id: true, email: true, password: true, role: true },
                });

                if (matchingUsers.length > 1) {
                    throw new Error("UsePortalLogin");
                }

                user = matchingUsers[0] ?? null;
            }

            if (!user || !user.password) {
                throw new Error("Invalid credentials");
            }

            const isPasswordCorrect = await bcrypt.compare(rawPassword, user.password);
            if (!isPasswordCorrect) {
                throw new Error("Invalid credentials");
            }

            return user;
        }
    }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
        GoogleProvider({
            id: "google-patient",
            name: "Google (Patient)",
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        GoogleProvider({
            id: "google-doctor",
            name: "Google (Doctor)",
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        GoogleProvider({
            id: "google-pharmacist",
            name: "Google (Pharmacist)",
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),

    );
}

export const authOptions: NextAuthOptions = {
    providers,
    callbacks: {
        async session({ session, token }) {
            const safeToken = token as any;
            if (token && session.user) {
                (session.user as any).id = safeToken.userId;
                (session.user as any).role = safeToken.role;
            }
            return session;
        },
        async signIn({ user, account }) {
            const email = user.email?.trim().toLowerCase();

            if (!email) {
                return false;
            }

            const googleRole = account?.provider ? googleProviderRoleMap[account.provider] : undefined;
            const targetRole = googleRole || "PATIENT";

            let dbUser = await prisma.user.findFirst({
                where: {
                    email,
                    role: targetRole,
                },
            });

            if (googleRole && !dbUser) {
                const generatedPassword = await bcrypt.hash(crypto.randomUUID(), 10);
                dbUser = await prisma.user.create({
                    data: {
                        email,
                        name: user.name || "Google User",
                        password: generatedPassword,
                        role: targetRole,
                        isApproved: true,
                        ...(targetRole === "PATIENT" && {
                            patientProfile: {
                                create: {
                                    universalId: `EPID${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
                                    dob: new Date(),
                                    address: "",
                                    phone: "",
                                },
                            },
                        }),
                    },
                });
            }

            if (!dbUser) {
                return false;
            }

            (user as any).id = dbUser.id;
            (user as any).role = dbUser.role;

            return true;
        },
        async jwt({ token, user }) {
            const mutableToken = token as any;
            if ((user as any)?.id) {
                mutableToken.userId = (user as any).id;
                mutableToken.role = (user as any).role;
            } else if (user?.email) {
                const normalizedEmail = user.email.toLowerCase();
                const role = token.role as AppRole | undefined;
                const dbUser = role === "ADMIN" || role === "SUPER_ADMIN"
                    ? await prisma.admin.findFirst({
                        where: {
                            email: normalizedEmail,
                            ...(role ? { role } : {}),
                        },
                        select: { id: true, role: true },
                    })
                    : await prisma.user.findFirst({
                        where: {
                            email: normalizedEmail,
                            ...(role ? { role: role as Role } : {}),
                        },
                        select: { id: true, role: true },
                    });

                if (dbUser) {
                    mutableToken.userId = dbUser.id;
                    mutableToken.role = dbUser.role;
                }
            }

            if (user) {
                mutableToken.userId = mutableToken.userId || (user as any).id;
                mutableToken.role = mutableToken.role || (user as any).role || "PATIENT";
            }
            return mutableToken;
        },
    },
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
