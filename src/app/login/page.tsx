"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginPageContent() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const registered = searchParams.get("registered");

        if (registered === "true") {
            setNotice("Registration successful. You can now sign in.");
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await signIn("credentials", {
                identifier,
                password,
                redirect: false,
            });

            if (res?.error) {
                setError("Invalid email or password");
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        } catch {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError("");
        try {
            await signIn("google", { callbackUrl: "/dashboard" });
        } catch {
            setError("Google sign-in failed");
            setLoading(false);
        }
    };

    return (
        <div className="auth-container" style={{ flexDirection: "column", gap: "2rem" }}>

            {/* Title */}
            <div style={{ textAlign: "center" }}>
                <h1 style={{
                    fontSize: "2rem",
                    fontWeight: 800,
                    color: "var(--primary)",
                    letterSpacing: "-0.03em",
                    marginBottom: "0.25rem",
                }}>
                    E-Prescribe
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
                    Modern Care, Simplified.
                </p>
            </div>

            {/* Card */}
            <div className="card" style={{ maxWidth: "320px", width: "100%" }}>
                <h2 style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    textAlign: "center",
                    marginBottom: "1.5rem",
                    color: "var(--text-main)",
                }}>
                    Sign In
                </h2>

                {error && (
                    <div style={{
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        color: "#b91c1c",
                        borderRadius: "0.5rem",
                        padding: "0.625rem 0.875rem",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        marginBottom: "1rem",
                    }}>
                        {error}
                    </div>
                )}

                {notice && (
                    <div style={{
                        background: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        color: "#065f46",
                        borderRadius: "0.5rem",
                        padding: "0.625rem 0.875rem",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        marginBottom: "1rem",
                    }}>
                        {notice}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="login-email">Email or Username</label>
                        <input
                            id="login-email"
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                            placeholder="doctor@example.com"
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="login-password">Password</label>
                        <input
                            id="login-password"
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
                        style={{ marginTop: "0.5rem" }}
                    >
                        {loading ? "Signing in…" : "Sign In"}
                    </button>
                </form>

                <button
                    type="button"
                    disabled={loading}
                    onClick={handleGoogleSignIn}
                    className="btn"
                    style={{ marginTop: "0.75rem", width: "100%" }}
                >
                    Continue with Google
                </button>

                <p style={{
                    textAlign: "center",
                    marginTop: "1.5rem",
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                }}>
                    Don&apos;t have an account?{" "}
                    <Link href="/register" style={{ color: "var(--primary)", fontWeight: 600 }}>
                        Register here
                    </Link>
                </p>
            </div>

            {/* Footer */}
            <p style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                textAlign: "center",
                maxWidth: "320px",
            }}>
                Secure platform for healthcare professionals to manage digital prescriptions.
            </p>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginPageContent />
        </Suspense>
    );
}
