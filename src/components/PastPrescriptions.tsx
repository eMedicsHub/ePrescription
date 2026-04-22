"use client";

import { useEffect, useState } from "react";
import PrescriptionPrintView from "./PrescriptionPrintView";

export default function PastPrescriptions({
    patientId,
    onClone,
    onCancel
}: {
    patientId: string,
    onClone?: (prescription: any) => void,
    onCancel?: (prescriptionId: string) => void
}) {
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/prescriptions?patientId=${patientId}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setPrescriptions(data.slice(0, 5));
                } else {
                    console.error("Prescriptions API returned non-array:", data);
                    setPrescriptions([]);
                }
            }
        } catch (error) {
            console.error("Failed to fetch prescription history", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (patientId) {
            fetchHistory();
        }
    }, [patientId]);

    const handleCancel = async (e: React.MouseEvent, p: any) => {
        e.stopPropagation();
        if (!onCancel || p.status !== 'PENDING') return;

        if (!confirm("Are you sure you want to cancel this prescription?")) return;

        setCancellingId(p.id);
        try {
            const res = await fetch(`/api/prescriptions/${p.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "CANCELLED" })
            });

            if (res.ok) {
                onCancel(p.id);
                fetchHistory(); // Refresh the list
                if (selectedPrescription?.id === p.id) {
                    setSelectedPrescription(null);
                }
            } else {
                alert("Failed to cancel prescription");
            }
        } catch (err) {
            console.error("Error cancelling prescription", err);
            alert("An error occurred");
        } finally {
            setCancellingId(null);
        }
    };

    const handleClone = (e: React.MouseEvent, p: any) => {
        e.stopPropagation();
        if (onClone) {
            onClone(p);
            setSelectedPrescription(null); // Close modal if open
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top where form usually is
        }
    };

    if (loading) return <div className="text-muted text-sm p-4">Loading history...</div>;

    if (prescriptions.length === 0) {
        return null;
    }

    return (
        <>
            <div className="card" style={{ marginBottom: "2rem", borderLeft: "4px solid var(--primary)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h4 style={{ margin: 0 }}>Previous Prescriptions (Last 5)</h4>
                    <span className="text-sm text-muted">Click to view details</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                    {prescriptions.map((p) => (
                        <div
                            key={p.id}
                            onClick={() => setSelectedPrescription(p)}
                            style={{
                                padding: "1rem",
                                background: "var(--bg-main)",
                                borderRadius: "var(--radius)",
                                fontSize: "0.875rem",
                                cursor: "pointer",
                                transition: "transform 0.2s, box-shadow 0.2s",
                                border: "1px solid transparent"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-2px)";
                                e.currentTarget.style.boxShadow = "var(--shadow-md)";
                                e.currentTarget.style.borderColor = "var(--primary)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.borderColor = "transparent";
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                                <div style={{ flex: 1, minWidth: 0, marginRight: "1rem" }}>
                                    <p style={{ fontWeight: 600, fontSize: "0.875rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0 }}>
                                        {new Date(p.createdAt).toLocaleDateString()}
                                        <span style={{ marginLeft: "0.5rem", fontWeight: "normal", color: "var(--text-muted)" }}>| ID: {p.id}</span>
                                    </p>
                                </div>
                                <span className={`badge badge-${p.status.toLowerCase()}`} style={{ flexShrink: 0 }}>
                                    {p.status}
                                </span>
                            </div>
                            <div style={{ marginBottom: "0.5rem" }}>
                                <strong>Doctor:</strong> {p.doctor.name}
                            </div>

                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap" }}>
                                {onClone && (
                                    <button
                                        className="btn btn-primary"
                                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", background: "var(--primary)" }}
                                        onClick={(e) => handleClone(e, p)}
                                    >
                                        Clone / Repeat
                                    </button>
                                )}
                                {/* Stop propagation so clicking Print doesn't open the modal */}
                                <span onClick={(e) => e.stopPropagation()}>
                                    <PrescriptionPrintView prescription={p} />
                                </span>
                                {onCancel && p.status === 'PENDING' && (
                                    <button
                                        className="btn-logout"
                                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", background: "var(--error)", color: "white" }}
                                        onClick={(e) => handleCancel(e, p)}
                                        disabled={cancellingId === p.id}
                                    >
                                        {cancellingId === p.id ? "Cancelling..." : "Cancel"}
                                    </button>
                                )}
                            </div>

                        </div>
                    ))}
                </div>
            </div>

            {selectedPrescription && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0,0,0,0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                        backdropFilter: "blur(4px)"
                    }}
                    onClick={() => setSelectedPrescription(null)}
                >
                    <div
                        className="card"
                        style={{ maxWidth: "600px", width: "95%", maxHeight: "90vh", overflowY: "auto" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                            <h3>Prescription Details</h3>
                            <button
                                className="btn-logout"
                                onClick={() => setSelectedPrescription(null)}
                                style={{ padding: "0.25rem 0.75rem", fontSize: "1.25rem" }}
                            >
                                &times;
                            </button>
                        </div>

                        <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "var(--bg-main)", borderRadius: "var(--radius)" }}>
                            <p><strong>Date:</strong> {new Date(selectedPrescription.createdAt).toLocaleString()}</p>
                            <p><strong>Status:</strong> <span className={`badge badge-${selectedPrescription.status.toLowerCase()}`}>{selectedPrescription.status}</span></p>
                            <p><strong>ID:</strong> {selectedPrescription.id}</p>
                        </div>

                        <h4>Medications</h4>
                        <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
                            {Array.isArray(selectedPrescription.medications) && selectedPrescription.medications.map((med: any) => (
                                <div key={med.id} style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                                    <div style={{ fontWeight: 600, color: "var(--primary)" }}>{med.name}</div>
                                    <div className="text-sm text-muted">
                                        {med.dosage} | {med.frequency} | {med.duration}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {selectedPrescription.notes && (
                            <div style={{ marginTop: "1.5rem" }}>
                                <h4>Notes</h4>
                                <p className="text-muted" style={{ marginTop: "0.5rem", fontStyle: "italic" }}>
                                    {selectedPrescription.notes}
                                </p>
                            </div>
                        )}

                        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => setSelectedPrescription(null)}
                            >
                                Close
                            </button>
                            {onClone && (
                                <button
                                    className="btn btn-primary"
                                    onClick={(e) => handleClone(e, selectedPrescription)}
                                >
                                    Clone / Repeat
                                </button>
                            )}
                            <PrescriptionPrintView prescription={selectedPrescription} />
                            {onCancel && selectedPrescription.status === 'PENDING' && (
                                <button
                                    className="btn-logout"
                                    onClick={(e) => handleCancel(e, selectedPrescription)}
                                    disabled={cancellingId === selectedPrescription.id}
                                    style={{ background: "var(--error)", color: "white" }}
                                >
                                    {cancellingId === selectedPrescription.id ? "Cancelling..." : "Cancel"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
