"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ROLE = "PHARMACIST";
const PORTAL_KEY = "myph";
const PORTAL_LABEL = "myph";
const ROLE_LABEL = "Pharmacist";
const ACCENT_COLOR = "#7c3aed";

export default function PharmacistRegisterPage() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: ROLE
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                router.push(`/${PORTAL_KEY}/login?registered=pending`);
            } else {
                const data = await res.json();
                setError(data.error || "Registration failed");
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="card" style={{ maxWidth: "400px", width: "100%" }}>
                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0.35rem 0.8rem",
                        borderRadius: "999px",
                        background: `${ACCENT_COLOR}18`,
                        color: ACCENT_COLOR,
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        marginBottom: "1rem",
                    }}
                >
                    {PORTAL_LABEL}
                </div>

                <h1
                    style={{
                        fontSize: "1.75rem",
                        fontWeight: 800,
                        color: ACCENT_COLOR,
                        letterSpacing: "-0.03em",
                        marginBottom: "0.5rem",
                    }}
                >
                    {ROLE_LABEL} Registration
                </h1>

                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
                    Create your {ROLE_LABEL.toLowerCase()} account to dispense prescriptions
                </p>

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
                        <label htmlFor="register-name">Full Name</label>
                        <input
                            id="register-name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="Your name"
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="register-email">Email</label>
                        <input
                            id="register-email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            placeholder="your@email.com"
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="register-password">Password</label>
                        <input
                            id="register-password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ background: ACCENT_COLOR, borderColor: ACCENT_COLOR, width: "100%" }}
                    >
                        {loading ? "Creating account..." : "Create Account"}
                    </button>
                </form>

                <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", textAlign: "center", marginTop: "1rem" }}>
                    Already have an account? <Link href={`/${PORTAL_KEY}/login`} style={{ color: ACCENT_COLOR, fontWeight: 600 }}>Sign in here</Link>
                </p>
            </div>
        </div>
    );
}
