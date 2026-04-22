"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "PATIENT"
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
                router.push("/login?registered=true");
            } else {
                const data = await res.json();
                setError(data.error || "Something went wrong");
            }
        } catch (err) {
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
        <div className="auth-container">
            <div className="card">
                <Link href="/" className="logo">E-Prescribe</Link>
                <h2 className="text-center">Create an account</h2>

                {error && <div className="error-message">{error}</div>}

                <div style={{
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    color: "#1d4ed8",
                    borderRadius: "0.75rem",
                    padding: "0.875rem 1rem",
                    fontSize: "0.875rem",
                    marginBottom: "1rem",
                }}>
                    New accounts can sign in immediately after registration.
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="Dr. John Doe"
                        />
                    </div>

                    <div className="input-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            placeholder="doctor@example.com"
                        />
                    </div>

                    <div className="input-group">
                        <label>Role</label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            required
                        >
                            <option value="DOCTOR">Doctor</option>
                            <option value="PHARMACIST">Pharmacist</option>
                            <option value="PATIENT">Patient</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            placeholder="••••••••"
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? "Creating account..." : "Register"}
                    </button>
                </form>

                <button
                    type="button"
                    className="btn"
                    style={{ marginTop: "0.75rem", width: "100%" }}
                    disabled={loading}
                    onClick={handleGoogleSignIn}
                >
                    Register with Google
                </button>

                <p className="text-center mt-4 text-sm">
                    Already have an account? <Link href="/login" className="link">Login here</Link>
                </p>
            </div>
        </div>
    );
}
