import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { AdminRole, Role } from "@prisma/client";

const googleProviderRoleMap: Record<string, Role> = {
    "google-patient": "PATIENT",
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
            const portalRole = credentials?.portalRole as string | undefined;

            if (!identifier || !rawPassword) {
                throw new Error("Invalid credentials");
            }

            const normalizedIdentifier = identifier.toLowerCase();
            let user: { id: string; email: string; password: string; role: string; isApproved: boolean; denialReason?: string | null } | null = null;

            if (portalRole === "ADMIN" || portalRole === "SUPER_ADMIN") {
                const dbAdmin = await prisma.admin.findFirst({
                    where: {
                        email: normalizedIdentifier,
                        role: portalRole as AdminRole,
                    },
                    select: { id: true, email: true, password: true, role: true, isApproved: true },
                });
                if (dbAdmin) {
                    user = {
                        ...dbAdmin,
                        role: String(dbAdmin.role),
                    };
                }
            } else if (portalRole) {
                const dbUser = await prisma.user.findFirst({
                    where: {
                        email: normalizedIdentifier,
                        role: portalRole as Role,
                    },
                    select: { id: true, email: true, password: true, role: true, isApproved: true, denialReason: true },
                });
                if (dbUser) {
                    user = {
                        ...dbUser,
                        role: String(dbUser.role),
                    };
                }
            } else {
                const matchingUsers = await prisma.user.findMany({
                    where: {
                        email: normalizedIdentifier,
                        role: {
                            in: ["PATIENT", "DOCTOR", "PHARMACIST"] as Role[],
                        },
                    },
                    take: 2,
                    select: { id: true, email: true, password: true, role: true, isApproved: true, denialReason: true },
                });

                if (matchingUsers.length > 1) {
                    throw new Error("UsePortalLogin");
                }

                if (matchingUsers[0]) {
                    user = {
                        ...matchingUsers[0],
                        role: String(matchingUsers[0].role),
                    };
                }
            }

            if (!user || !user.password) {
                throw new Error("Invalid credentials");
            }

            if (!user.isApproved) {
                if (user.denialReason) {
                    throw new Error(`AccountDenied:${user.denialReason}`);
                }
                throw new Error("AccountNotApproved");
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
    const baseGoogleConfig = {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        allowDangerousEmailAccountLinking: true,
    };

    providers.push(
        GoogleProvider({
            ...baseGoogleConfig,
            id: "google-patient",
            name: "Google (EmedsUser)",
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
                (session.user as any).role = String(safeToken.role || "PATIENT");
            }
            return session;
        },
        async signIn({ user, account }) {
            if (account?.provider === "credentials") {
                return true;
            }

            const email = user.email?.trim().toLowerCase();

            if (!email) {
                console.error("[Auth] No email provided from OAuth provider");
                return false;
            }

            if (account?.provider && !googleProviderRoleMap[account.provider]) {
                console.error(`[Auth] Google sign-in blocked for provider=${account.provider}`);
                return false;
            }

            const googleRole = account?.provider ? googleProviderRoleMap[account.provider] : undefined;
            const targetRole = googleRole || "PATIENT";

            console.log(`[Auth] Google sign-in attempt: email=${email}, provider=${account?.provider}, targetRole=${targetRole}`);

            let dbUser = await prisma.user.findFirst({
                where: {
                    email,
                    role: targetRole,
                },
            });

            if (googleRole && !dbUser) {
                console.log(`[Auth] User not found, creating new user: email=${email}, role=${targetRole}`);
                try {
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
                    console.log(`[Auth] User created successfully: id=${dbUser.id}, email=${email}`);
                } catch (error) {
                    console.error(`[Auth] Failed to create user:`, error);
                    return false;
                }
            }

            if (!dbUser) {
                console.error(`[Auth] User not found and couldn't be created: email=${email}, role=${targetRole}`);
                return false;
            }

            if (!dbUser.isApproved) {
                console.error(`[Auth] User is not approved: email=${email}, role=${targetRole}`);
                return false;
            }

            console.log(`[Auth] sign-in successful: userId=${dbUser.id}, email=${email}, role=${dbUser.role}`);
            (user as any).id = dbUser.id;
            (user as any).role = String(dbUser.role);

            return true;
        },
        async jwt({ token, user }) {
            const mutableToken = token as any;
            if ((user as any)?.id) {
                mutableToken.userId = (user as any).id;
                mutableToken.role = String((user as any).role);
            } else if (user?.email) {
                const normalizedEmail = user.email.toLowerCase();
                const role = token.role as string | undefined;
                const dbUser = role === "ADMIN" || role === "SUPER_ADMIN"
                    ? await prisma.admin.findFirst({
                        where: {
                            email: normalizedEmail,
                            ...(role ? { role: role as AdminRole } : {}),
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
                    mutableToken.role = String(dbUser.role);
                }
            }

            if (user) {
                mutableToken.userId = mutableToken.userId || (user as any).id;
                mutableToken.role = mutableToken.role || String((user as any).role) || "PATIENT";
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
