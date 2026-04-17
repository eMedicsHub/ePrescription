"use client";

import { useState } from "react";

export default function PharmacistDashboardClient() {
    const [prescriptionId, setPrescriptionId] = useState("");
    const [prescription, setPrescription] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const searchPrescription = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");
        setPrescription(null);

        try {
            // We'll reuse the prescriptions GET endpoint but filter by ID if needed, 
            // or just fetch by ID directly. Let's assume we can fetch by ID.
            const res = await fetch(`/api/prescriptions?id=${prescriptionId}`);
            const data = await res.json();

            // In our current API, GET /api/prescriptions returns an array.
            // Let's adjust this client to handle finding a specific one or add a specific ID endpoint.
            const found = data.find((p: any) => p.id === prescriptionId);

            if (found) {
                setPrescription(found);
            } else {
                setError("Prescription not found");
            }
        } catch (err) {
            setError("An error occurred during search");
        } finally {
            setLoading(false);
        }
    };

    const markAsDispensed = async () => {
        if (!prescription) return;
        setLoading(true);

        try {
            const res = await fetch(`/api/prescriptions/${prescription.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "DISPENSED" })
            });

            if (res.ok) {
                setSuccess("Prescription marked as dispensed successfully!");
                setPrescription({ ...prescription, status: "DISPENSED" });
            } else {
                setError("Failed to update status");
            }
        } catch (err) {
            setError("An error occurred during update");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid">
            <aside>
                <div className="card">
                    <h3>Search Prescription</h3>
                    <form onSubmit={searchPrescription}>
                        <input
                            type="text"
                            placeholder="Enter Prescription ID..."
                            value={prescriptionId}
                            onChange={(e) => setPrescriptionId(e.target.value)}
                            required
                        />
                        <button type="submit" className="btn btn-primary mt-4" disabled={loading}>
                            {loading ? "Searching..." : "Search"}
                        </button>
                    </form>
                </div>
            </aside>

            <main>
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                {prescription ? (
                    <div className="card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                            <div>
                                <h3 style={{ marginBottom: "0.25rem" }}>Prescription Details</h3>
                                <p className="text-sm text-muted">ID: {prescription.id}</p>
                            </div>
                            <span className={`badge badge-${prescription.status.toLowerCase()}`}>
                                {prescription.status}
                            </span>
                        </div>

                        <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "var(--bg-main)", borderRadius: "0.5rem" }}>
                            <p><strong>EmedsUser:</strong> {prescription.patient.user.name}</p>
                            <p><strong>Doctor:</strong> {prescription.doctor.name}</p>
                            <p><strong>Date:</strong> {new Date(prescription.createdAt).toLocaleDateString()}</p>
                        </div>

                        <h4>Medications</h4>
                        <div className="mt-4">
                            {prescription.medications.map((med: any) => (
                                <div key={med.id} className="list-item" style={{ cursor: "default" }}>
                                    <strong>{med.name}</strong>
                                    <p className="text-sm text-muted">
                                        {med.dosage} | {med.frequency} | {med.duration}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {prescription.notes && (
                            <div className="mt-4">
                                <p><strong>Notes:</strong> {prescription.notes}</p>
                            </div>
                        )}

                        {prescription.status === "PENDING" && (
                            <button
                                onClick={markAsDispensed}
                                className="btn btn-primary mt-4"
                                disabled={loading}
                                style={{ background: "var(--success)" }}
                            >
                                Mark as Dispensed
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="card text-center" style={{ padding: "4rem" }}>
                        <p className="text-muted">Enter a Prescription ID to view details and dispense</p>
                    </div>
                )}
            </main>
        </div>
    );
}
