"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type AdminLoginClientProps = {
    portalLabel?: string;
};

function AdminLoginContent({ portalLabel = "Admin Portal" }: AdminLoginClientProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const passwordRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (showPassword) {
            setTimeout(() => {
                passwordRef.current?.focus();
            }, 40);
        }
    }, [showPassword]);

    async function routeAfterLogin() {
        const session = await getSession();
        const role = (session?.user as any)?.role;

        if (role === "ADMIN" || role === "SUPER_ADMIN") {
            router.push("/manage");
            router.refresh();
            return;
        }

        setError("This portal is for administrators only.");
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await signIn("credentials", {
                identifier: email,
                password,
                portalRole: "ADMIN",
                redirect: false,
            });

            if (res?.error) {
                if (res.error === "AccountNotApproved") {
                    setError("Your account is pending admin verification.");
                } else if (res.error === "UsePortalLogin") {
                    setError("Invalid login credentials for this admin account.");
                } else {
                    setError("Invalid email or password");
                }
                return;
            }

            await routeAfterLogin();
        } catch {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container" style={{ flexDirection: "column", gap: "2rem" }}>
            <div style={{ textAlign: "center" }}>
                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0.35rem 0.8rem",
                        borderRadius: "999px",
                        background: "#1f2937dd",
                        color: "#fff",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        marginBottom: "1rem",
                    }}
                >
                    {portalLabel}
                </div>
                <h1
                    style={{
                        fontSize: "2rem",
                        fontWeight: 800,
                        color: "#1f2937",
                        letterSpacing: "-0.03em",
                        marginBottom: "0.25rem",
                    }}
                >
                    Admin Login
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
                    Manage system settings, approve registrations, and administer the platform.
                </p>
            </div>

            <div className="card" style={{ maxWidth: "360px", width: "100%" }}>
                <h2
                    style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        textAlign: "center",
                        marginBottom: "1.5rem",
                        color: "var(--text-main)",
                    }}
                >
                    Sign In
                </h2>

                {error && (
                    <div
                        style={{
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            color: "#b91c1c",
                            borderRadius: "0.5rem",
                            padding: "0.625rem 0.875rem",
                            fontSize: "0.875rem",
                            fontWeight: 500,
                            marginBottom: "1rem",
                        }}
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="admin-login-email">Email</label>
                        <input
                            id="admin-login-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="admin@example.com"
                        />
                    </div>

                    {!showPassword && (
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => setShowPassword(true)}
                            className="btn btn-primary"
                            style={{ marginTop: "0.5rem", background: "#1f2937", borderColor: "#1f2937", width: "100%" }}
                        >
                            Continue
                        </button>
                    )}

                    {showPassword && (
                        <>
                            <div className="input-group">
                                <label htmlFor="admin-login-password">Password</label>
                                <input
                                    ref={passwordRef}
                                    id="admin-login-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary"
                                style={{ marginTop: "0.5rem", background: "#1f2937", borderColor: "#1f2937", width: "100%" }}
                            >
                                {loading ? "Signing in…" : "Sign In"}
                            </button>
                        </>
                    )}
                </form>

                <p
                    style={{
                        textAlign: "center",
                        marginTop: "1.5rem",
                        fontSize: "0.875rem",
                        color: "var(--text-muted)",
                    }}
                >
                    <Link href="/mypa/login" style={{ color: "#1f2937", fontWeight: 600 }}>
                        Back to portals
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function AdminLoginClient(props: AdminLoginClientProps) {
    return (
        <Suspense fallback={null}>
            <AdminLoginContent {...props} />
        </Suspense>
    );
}
