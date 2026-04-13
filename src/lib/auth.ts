import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

const providers: NextAuthOptions["providers"] = [
    CredentialsProvider({
        name: "credentials",
        credentials: {
            identifier: { label: "Email or Username", type: "text" },
            password: { label: "Password", type: "password" }
        },
        async authorize(credentials) {
            const identifier = credentials?.identifier?.trim();
            const rawPassword = credentials?.password;

            if (!identifier || !rawPassword) {
                throw new Error("Invalid credentials");
            }

            const normalizedIdentifier = identifier.toLowerCase();
            const user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email: identifier },
                        { email: normalizedIdentifier },
                    ],
                },
            });

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
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })
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

            let dbUser = await prisma.user.findUnique({
                where: { email },
            });

            if (account?.provider === "google" && !dbUser) {
                const generatedPassword = await bcrypt.hash(crypto.randomUUID(), 10);
                dbUser = await prisma.user.create({
                    data: {
                        email,
                        name: user.name || "Google User",
                        password: generatedPassword,
                        role: "PATIENT",
                        isApproved: true,
                        patientProfile: {
                            create: {
                                dob: new Date(),
                                address: "",
                                phone: "",
                            },
                        },
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
            if (user?.email) {
                const dbUser = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: user.email },
                            { email: user.email.toLowerCase() },
                        ],
                    },
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
