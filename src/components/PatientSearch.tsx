"use client";

import { useState, useEffect } from "react";

export default function PatientSearch({ onSelect }: { onSelect: (patient: any) => void }) {
    const [query, setQuery] = useState("");
    const [patients, setPatients] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // New Patient Form State
    const [showNewForm, setShowNewForm] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDob, setNewDob] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (query.length > 2) {
                setShowNewForm(false);
                searchPatients();
            } else {
                setPatients([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const searchPatients = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/patients?q=${query}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setPatients(data);
            } else {
                console.error("Patient API returned non-array:", data);
                setPatients([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePatient = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");
        setIsCreating(true);

        try {
            const res = await fetch("/api/patients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newName,
                    dob: newDob,
                    phone: newPhone,
                    email: newEmail
                })
            });

            const data = await res.json();

            if (res.ok) {
                // Return the new patient payload mapping to the structure Search usually provides
                onSelect(data);
                // Reset form
                setShowNewForm(false);
                setQuery("");
                setNewName("");
                setNewDob("");
                setNewPhone("");
                setNewEmail("");
            } else {
                setErrorMsg(data.error || "Failed to create patient");
            }
        } catch (err) {
            setErrorMsg("Network error occurred");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="card">
            <h3>Search Patient</h3>
            {!showNewForm ? (
                <>
                    <input
                        type="text"
                        placeholder="Name, email or phone..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />

                    <div className="mt-4">
                        {loading && <p>Searching...</p>}
                        {patients.map((p: any) => (
                            <div
                                key={p.id}
                                className="list-item"
                                onClick={() => onSelect(p)}
                            >
                                <strong>{p.user.name}</strong>
                                <p className="text-sm text-muted">{p.universalId} | {p.user.email} | {p.phone}</p>
                            </div>
                        ))}
                        {query.length > 2 && patients.length === 0 && !loading && (
                            <div style={{ textAlign: "center", marginTop: "1rem" }}>
                                <p className="text-muted" style={{ marginBottom: "1rem" }}>No patients found.</p>
                                <button
                                    className="btn btn-primary"
                                    style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
                                    onClick={() => {
                                        setNewName(query); // pre-fill the name
                                        setShowNewForm(true);
                                    }}
                                >
                                    Add New Patient
                                </button>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <form onSubmit={handleCreatePatient} style={{ marginTop: "1rem" }}>
                    {errorMsg && <div className="error-message" style={{ padding: "0.5rem", marginBottom: "1rem" }}>{errorMsg}</div>}

                    <div className="input-group">
                        <label>Full Name *</label>
                        <input
                            type="text"
                            required
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                    </div>

                    <div className="input-group">
                        <label>Date of Birth *</label>
                        <input
                            type="date"
                            required
                            value={newDob}
                            onChange={(e) => setNewDob(e.target.value)}
                        />
                    </div>

                    <div className="input-group">
                        <label>Phone (Optional)</label>
                        <input
                            type="tel"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                        />
                    </div>

                    <div className="input-group">
                        <label>Email (Optional)</label>
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                        />
                    </div>

                    <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                        <button type="button" className="btn-logout" style={{ flex: 1 }} onClick={() => setShowNewForm(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={isCreating}>
                            {isCreating ? "Creating..." : "Save Patient"}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
