"use client";

import { useEffect, useMemo, useState } from "react";

type HealthProfile = {
    name: string;
    email: string;
    universalId: string;
    dob: string;
    age: number;
    phone: string;
    address: string;
    heightCm: number | null;
    weightKg: number | null;
};

export default function HealthProfileClient() {
    const [form, setForm] = useState<HealthProfile>({
        name: "",
        email: "",
        universalId: "",
        dob: "",
        age: 0,
        phone: "",
        address: "",
        heightCm: null,
        weightKg: null,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch("/api/patient/profile");
                const data = await res.json();
                if (!res.ok) {
                    setError(data.error || "Failed to load health profile");
                    return;
                }
                setForm({
                    ...data,
                    dob: data.dob ? new Date(data.dob).toISOString().slice(0, 10) : "",
                });
            } catch {
                setError("Failed to load health profile");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const bmi = useMemo(() => {
        if (!form.heightCm || !form.weightKg) return null;
        const heightInMeters = form.heightCm / 100;
        const value = form.weightKg / (heightInMeters * heightInMeters);
        return Number.isFinite(value) ? value.toFixed(1) : null;
    }, [form.heightCm, form.weightKg]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage("");
        setError("");

        try {
            const res = await fetch("/api/patient/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dob: form.dob,
                    heightCm: form.heightCm,
                    weightKg: form.weightKg,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to update health profile");
                return;
            }
            setForm((current) => ({
                ...current,
                age: data.age,
                dob: data.dob ? new Date(data.dob).toISOString().slice(0, 10) : current.dob,
                heightCm: data.heightCm,
                weightKg: data.weightKg,
            }));
            setMessage("Health profile updated.");
        } catch {
            setError("Failed to update health profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="card">Loading health profile...</div>;
    }

    return (
        <div className="settings-shell">
            <div className="settings-hero card">
                <div>
                    <div className="patient-card-topline">Health Profile</div>
                    <h1>Your core health details</h1>
                    <p className="patient-helper-text">Maintain a quick personal snapshot with age, height, and weight so your medical history stays more useful over time.</p>
                </div>
                <div className="health-id-chip">{form.universalId}</div>
            </div>

            <div className="health-summary-grid">
                <div className="card health-stat-card">
                    <span>Age</span>
                    <strong>{form.age || "-"}</strong>
                </div>
                <div className="card health-stat-card">
                    <span>Height</span>
                    <strong>{form.heightCm ? `${form.heightCm} cm` : "-"}</strong>
                </div>
                <div className="card health-stat-card">
                    <span>Weight</span>
                    <strong>{form.weightKg ? `${form.weightKg} kg` : "-"}</strong>
                </div>
                <div className="card health-stat-card">
                    <span>BMI</span>
                    <strong>{bmi ?? "-"}</strong>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="card settings-form-card">
                {error && <div className="error-message">{error}</div>}
                {message && <div className="success-message">{message}</div>}

                <div className="settings-grid">
                    <div className="input-group">
                        <label>Full Name</label>
                        <input value={form.name} readOnly />
                    </div>
                    <div className="input-group">
                        <label>Email</label>
                        <input value={form.email} readOnly />
                    </div>
                    <div className="input-group">
                        <label>Date of Birth</label>
                        <input type="date" value={form.dob} onChange={(e) => setForm((current) => ({ ...current, dob: e.target.value }))} />
                    </div>
                    <div className="input-group">
                        <label>Age</label>
                        <input value={String(form.age || "")} readOnly />
                    </div>
                    <div className="input-group">
                        <label>Height (cm)</label>
                        <input
                            type="number"
                            min="1"
                            step="0.1"
                            value={form.heightCm ?? ""}
                            onChange={(e) => setForm((current) => ({ ...current, heightCm: e.target.value ? Number(e.target.value) : null }))}
                        />
                    </div>
                    <div className="input-group">
                        <label>Weight (kg)</label>
                        <input
                            type="number"
                            min="1"
                            step="0.1"
                            value={form.weightKg ?? ""}
                            onChange={(e) => setForm((current) => ({ ...current, weightKg: e.target.value ? Number(e.target.value) : null }))}
                        />
                    </div>
                </div>

                <button type="submit" className="patient-action-primary settings-save-button" disabled={saving}>
                    {saving ? "Saving..." : "Save health profile"}
                </button>
            </form>
        </div>
    );
}
