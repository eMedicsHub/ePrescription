"use client";

import { useEffect, useState } from "react";

type SettingsData = {
    name: string;
    email: string;
    role: string;
    phone: string;
    address: string;
};

export default function SettingsClient() {
    const [form, setForm] = useState<SettingsData>({
        name: "",
        email: "",
        role: "",
        phone: "",
        address: "",
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch("/api/account/settings");
                const data = await res.json();
                if (!res.ok) {
                    setError(data.error || "Failed to load settings");
                    return;
                }
                setForm(data);
            } catch {
                setError("Failed to load settings");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        setMessage("");

        try {
            const res = await fetch("/api/account/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to save settings");
                return;
            }
            setMessage("Settings updated successfully.");
        } catch {
            setError("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="card">Loading settings...</div>;
    }

    return (
        <div className="settings-shell">
            <div className="settings-hero card">
                <div>
                    <div className="patient-card-topline">Settings</div>
                    <h1>Account settings</h1>
                    <p className="patient-helper-text">Keep your basic account details current so the portal stays useful and easy to contact through.</p>
                </div>
                <div className="settings-role-chip">{form.role}</div>
            </div>

            <form onSubmit={handleSubmit} className="card settings-form-card">
                {error && <div className="error-message">{error}</div>}
                {message && <div className="success-message">{message}</div>}

                <div className="settings-grid">
                    <div className="input-group">
                        <label>Full Name</label>
                        <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} />
                    </div>

                    <div className="input-group">
                        <label>Email Address</label>
                        <input value={form.email} readOnly />
                    </div>

                    <div className="input-group">
                        <label>Phone</label>
                        <input value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} disabled={form.role !== "PATIENT"} />
                    </div>

                    <div className="input-group">
                        <label>Role</label>
                        <input value={form.role} readOnly />
                    </div>
                </div>

                <div className="input-group">
                    <label>Address</label>
                    <textarea
                        rows={4}
                        value={form.address}
                        onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))}
                        disabled={form.role !== "PATIENT"}
                    />
                </div>

                <button type="submit" className="patient-action-primary settings-save-button" disabled={saving}>
                    {saving ? "Saving..." : "Save settings"}
                </button>
            </form>
        </div>
    );
}
