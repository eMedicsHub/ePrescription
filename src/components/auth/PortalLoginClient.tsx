"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

type PortalLoginClientProps = {
    portalKey: "mypa" | "mydp" | "myph";
    portalLabel: string;
    roleLabel: string;
    expectedRole: "PATIENT" | "DOCTOR" | "PHARMACIST";
    dashboardPath: string;
    accentColor: string;
    subtitle: string;
    registerPath?: string;
};

function PortalLoginContent({
    portalKey,
    portalLabel,
    roleLabel,
    expectedRole,
    dashboardPath,
    accentColor,
    subtitle,
    registerPath = "/register",
}: PortalLoginClientProps) {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const registered = searchParams.get("registered");

        if (registered === "true") {
            setNotice("Registration successful. You can now sign in.");
        } else if (registered === "pending") {
            setNotice("Registration submitted. An admin must approve your account before you can sign in.");
        }
    }, [searchParams]);

    useEffect(() => {
        if (showPassword) {
            // focus password input when revealed
            setTimeout(() => {
                passwordRef.current?.focus();
            }, 40);
        }
    }, [showPassword]);

    const passwordRef = useRef<HTMLInputElement | null>(null);

    async function routeAfterLogin() {
        const session = await getSession();
        const role = (session?.user as any)?.role;

        if (role === expectedRole) {
            router.push(dashboardPath);
            router.refresh();
            return;
        }

        const rolePortalMap: Record<string, string> = {
            PATIENT: "/mypa/login",
            DOCTOR: "/mydp/login",
            PHARMACIST: "/myph/login",
        };

        setError(`This portal is for ${roleLabel.toLowerCase()} only.`);

        const preferredPortal = role ? rolePortalMap[role] : undefined;
        if (preferredPortal && preferredPortal !== `/${portalKey}/login`) {
            setTimeout(() => {
                router.push(preferredPortal);
            }, 1200);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await signIn("credentials", {
                identifier,
                password,
                portalRole: expectedRole,
                redirect: false,
            });

            if (res?.error) {
                if (res.error === "AccountNotApproved") {
                    setError("Your account is pending admin approval.");
                } else if (res.error === "UsePortalLogin") {
                    setError("Use the correct portal for this account role.");
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
                        background: `${accentColor}18`,
                        color: accentColor,
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
                        color: accentColor,
                        letterSpacing: "-0.03em",
                        marginBottom: "0.25rem",
                    }}
                >
                    {roleLabel} Login
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>{subtitle}</p>
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
                    Sign In to {portalLabel}
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

                {notice && (
                    <div
                        style={{
                            background: "#ecfdf5",
                            border: "1px solid #a7f3d0",
                            color: "#065f46",
                            borderRadius: "0.5rem",
                            padding: "0.625rem 0.875rem",
                            fontSize: "0.875rem",
                            fontWeight: 500,
                            marginBottom: "1rem",
                        }}
                    >
                        {notice}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor={`${portalKey}-login-email`}>Email or Username</label>
                        <input
                            id={`${portalKey}-login-email`}
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                            placeholder={expectedRole === "PATIENT" ? "patient@example.com" : "doctor@example.com"}
                        />
                    </div>

                    {!showPassword && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => setShowPassword(true)}
                                className="btn btn-primary"
                                style={{ marginTop: "0.5rem", background: accentColor, borderColor: accentColor }}
                            >
                                {`Sign in to ${portalLabel}`}
                            </button>

                            
                        </div>
                    )}

                    {showPassword && (
                        <>
                            <div className="input-group">
                                <label htmlFor={`${portalKey}-login-password`}>Password</label>
                                <input
                                    ref={passwordRef}
                                    id={`${portalKey}-login-password`}
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
                                style={{ marginTop: "0.5rem", background: accentColor, borderColor: accentColor }}
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
                    Don&apos;t have an account? <Link href={registerPath} style={{ color: accentColor, fontWeight: 600 }}>Register here</Link>
                </p>
            </div>
        </div>
    );
}

export default function PortalLoginClient(props: PortalLoginClientProps) {
    return (
        <Suspense fallback={null}>
            <PortalLoginContent {...props} />
        </Suspense>
    );
}
