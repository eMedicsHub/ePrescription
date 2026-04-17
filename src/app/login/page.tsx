import Link from "next/link";

function isModuleEnabled(value: string | undefined) {
    if (!value) return true;
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

export default function LoginPage() {
    const patientModuleEnabled = isModuleEnabled(process.env.PATIENT_MODULE_ENABLED);
    const doctorModuleEnabled = isModuleEnabled(process.env.DOCTOR_MODULE_ENABLED);
    const pharmacistModuleEnabled = isModuleEnabled(process.env.PHARMACIST_MODULE_ENABLED);

    return (
        <div className="auth-container" style={{ flexDirection: "column", gap: "2rem" }}>
            <div style={{ textAlign: "center", maxWidth: "540px" }}>
                <h1
                    style={{
                        fontSize: "2.3rem",
                        fontWeight: 800,
                        color: "var(--primary)",
                        letterSpacing: "-0.03em",
                        marginBottom: "0.25rem",
                    }}
                >
                    Choose Your Portal
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>
                    Sign in through the portal for your account. The same email can be used across EmedsUser, doctor, and pharmacist accounts, but each portal signs you into its own role.
                </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", width: "100%", maxWidth: "860px" }}>
                {patientModuleEnabled && (
                    <Link
                        href="/mypa/login"
                        className="card"
                        style={{ textDecoration: "none", border: "1px solid rgba(15, 118, 110, 0.22)", background: "linear-gradient(180deg, rgba(15,118,110,0.08), rgba(255,255,255,0.98))" }}
                    >
                        <div style={{ color: "#0f766e", fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
                            mypa
                        </div>
                        <h2 style={{ margin: 0, color: "#134e4a", fontSize: "1.35rem" }}>EmedsUser</h2>
                        <p style={{ marginTop: "0.75rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                            Access your health timeline, reports, bills, prescriptions, and doctor access controls.
                        </p>
                    </Link>
                )}

                {doctorModuleEnabled && (
                    <Link
                        href="/mydp/login"
                        className="card"
                        style={{ textDecoration: "none", border: "1px solid rgba(29, 78, 216, 0.22)", background: "linear-gradient(180deg, rgba(29,78,216,0.08), rgba(255,255,255,0.98))" }}
                    >
                        <div style={{ color: "#1d4ed8", fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
                            mydp
                        </div>
                        <h2 style={{ margin: 0, color: "#1e3a8a", fontSize: "1.35rem" }}>Doctor Portal</h2>
                        <p style={{ marginTop: "0.75rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                            Manage EmedsUsers, prescriptions, doctor-added records, and consent-based access to health data.
                        </p>
                    </Link>
                )}

                {pharmacistModuleEnabled && (
                    <Link
                        href="/myph/login"
                        className="card"
                        style={{ textDecoration: "none", border: "1px solid rgba(124, 58, 237, 0.22)", background: "linear-gradient(180deg, rgba(124,58,237,0.08), rgba(255,255,255,0.98))" }}
                    >
                        <div style={{ color: "#7c3aed", fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
                            myph
                        </div>
                        <h2 style={{ margin: 0, color: "#5b21b6", fontSize: "1.35rem" }}>Pharmacist Portal</h2>
                        <p style={{ marginTop: "0.75rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                            Review prescriptions, verify fulfillment details, and update dispensing status securely.
                        </p>
                    </Link>
                )}
            </div>

            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", textAlign: "center", maxWidth: "520px" }}>
                Need an account first? <Link href="/register" style={{ color: "var(--primary)", fontWeight: 600 }}>Register here</Link> and choose the account type you want to create.
            </p>
        </div>
    );
}
