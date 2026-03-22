"use client";

import { useEffect, useState } from "react";

export default function PatientDashboardClient() {
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedPrescription, setSelectedPrescription] = useState<any>(null);

    // Consent management state
    const [consents, setConsents] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [searchDoctorQuery, setSearchDoctorQuery] = useState("");
    const [isSearchingDoctors, setIsSearchingDoctors] = useState(false);
    const [grantingConsentId, setGrantingConsentId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'prescriptions' | 'access'>('prescriptions');

    useEffect(() => {
        fetchPrescriptions();
        fetchConsents();
    }, []);

    const fetchConsents = async () => {
        try {
            const res = await fetch("/api/consents");
            const data = await res.json();
            if (Array.isArray(data)) {
                setConsents(data);
            } else {
                setConsents([]);
            }
        } catch (err) {
            console.error("Failed to load consents", err);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchDoctorQuery.length > 2) {
                searchDoctors();
            } else {
                setDoctors([]);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchDoctorQuery]);

    const searchDoctors = async () => {
        setIsSearchingDoctors(true);
        try {
            const res = await fetch(`/api/doctors?q=${searchDoctorQuery}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setDoctors(data);
            } else {
                setDoctors([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearchingDoctors(false);
        }
    };

    const grantConsent = async (doctorId: string) => {
        setGrantingConsentId(doctorId);
        try {
            const res = await fetch("/api/consents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ doctorId })
            });

            if (res.ok) {
                setSearchDoctorQuery("");
                fetchConsents();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to grant consent");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setGrantingConsentId(null);
        }
    };

    const revokeConsent = async (consentId: string) => {
        if (!confirm("Are you sure you want to revoke consent for this doctor? They will lose access to your full prescription history.")) return;

        try {
            const res = await fetch(`/api/consents?id=${consentId}`, { method: "DELETE" });
            if (res.ok) {
                fetchConsents();
            } else {
                alert("Failed to revoke consent");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchPrescriptions = async () => {
        try {
            const res = await fetch("/api/prescriptions");
            const data = await res.json();
            // API returns all ordered by date desc, we take top 5
            if (Array.isArray(data)) {
                setPrescriptions(data.slice(0, 5));
            } else {
                setPrescriptions([]);
            }
        } catch (err) {
            setError("Failed to load prescriptions");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        window.location.href = '/api/auth/signout';
    };

    return (
        <div className="dashboard-layout">
            <aside className="dashboard-sidebar">
                <button
                    className={`sidebar-tab ${activeTab === 'prescriptions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('prescriptions')}
                >
                    My Prescriptions
                </button>
                <button
                    className={`sidebar-tab ${activeTab === 'access' ? 'active' : ''}`}
                    onClick={() => setActiveTab('access')}
                >
                    Manage Doctor Access
                </button>

                <div style={{ marginTop: "auto", paddingTop: "2rem" }}>
                    <button className="sidebar-tab" onClick={handleLogout} style={{ color: "var(--error)" }}>
                        Logout
                    </button>
                </div>
            </aside>

            <main className="dashboard-content">


                {activeTab === 'prescriptions' && (
                    <div className="card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                            <h3 style={{ margin: 0 }}>My Prescriptions (Last 5)</h3>
                        </div>

                        {loading && <p className="mt-4">Loading your prescriptions...</p>}
                        {error && <div className="error-message mt-4">{error}</div>}

                        {!loading && prescriptions.length === 0 && (
                            <p className="mt-4 text-muted">You have no prescriptions on file.</p>
                        )}

                        <div className="mt-4" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>
                            {Array.isArray(prescriptions) && prescriptions.map((p: any) => (
                                <div
                                    key={p.id}
                                    className="list-item"
                                    style={{
                                        cursor: "pointer",
                                        transition: "transform 0.2s, box-shadow 0.2s",
                                        display: "flex",
                                        flexDirection: "column"
                                    }}
                                    onClick={() => setSelectedPrescription(p)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "translateY(-4px)";
                                        e.currentTarget.style.boxShadow = "var(--shadow-md)";
                                        e.currentTarget.style.borderColor = "var(--primary)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "translateY(0)";
                                        e.currentTarget.style.boxShadow = "none";
                                        e.currentTarget.style.borderColor = "var(--border)";
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                                        <div style={{ flex: 1, minWidth: 0, marginRight: "1rem" }}>
                                            <p className="text-sm" style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0 }}>
                                                {new Date(p.createdAt).toLocaleDateString()}
                                                <span style={{ marginLeft: "0.5rem", fontWeight: "normal", color: "var(--text-muted)" }}>| ID: {p.id}</span>
                                            </p>
                                        </div>
                                        <span className={`badge badge-${p.status.toLowerCase()}`} style={{ flexShrink: 0 }}>
                                            {p.status}
                                        </span>
                                    </div>

                                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", flexGrow: 1 }}>
                                        <p style={{ marginBottom: "0.5rem" }}><strong>Doctor:</strong> {p.doctor.name}</p>
                                    </div>

                                    <div className="text-sm text-primary mt-4 text-right font-semibold">
                                        View Details &rarr;
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Consent Management Section */}
                {activeTab === 'access' && (
                    <div className="card">
                        <h3 className="mb-4">Manage Doctor Access</h3>
                        <p className="text-sm text-muted mb-6">
                            Granting access allows a doctor to view your full prescription history.
                            Without explicit access, they can only see the prescriptions they have issued to you.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Active Consents */}
                            <div>
                                <h4 className="mb-4">Active Consents</h4>
                                {consents.length === 0 ? (
                                    <p className="text-sm text-muted">You haven't granted access to any doctors yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {Array.isArray(consents) && consents.map((consent) => (
                                            <div key={consent.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                                                <div>
                                                    <p className="font-medium text-sm text-gray-800">{consent.doctor.name}</p>
                                                    <p className="text-xs text-gray-500">{consent.doctor.email}</p>
                                                </div>
                                                <button
                                                    onClick={() => revokeConsent(consent.id)}
                                                    className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                                                >
                                                    Revoke
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Search and Grant */}
                            <div>
                                <h4 className="mb-4">Grant Access</h4>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search doctor by name or email..."
                                        value={searchDoctorQuery}
                                        onChange={(e) => setSearchDoctorQuery(e.target.value)}
                                        className="w-full px-4 py-2 mb-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    {isSearchingDoctors && (
                                        <span className="absolute right-3 top-2.5 text-xs text-blue-600 font-medium">Searching...</span>
                                    )}
                                </div>

                                {doctors.length > 0 && Array.isArray(doctors) && (
                                    <div className="mt-2 border border-gray-200 rounded-lg max-h-60 overflow-y-auto bg-white shadow-sm">
                                        {doctors.map((doc) => {
                                            const hasConsent = Array.isArray(consents) && consents.some(c => c.doctor.id === doc.id);

                                            return (
                                                <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50 last:border-0 transition-colors">
                                                    <div className="mb-2 sm:mb-0">
                                                        <p className="text-sm font-medium text-gray-800">{doc.name}</p>
                                                        <p className="text-xs text-gray-500">{doc.email}</p>
                                                    </div>
                                                    {hasConsent ? (
                                                        <span className="text-xs font-medium text-green-600 px-2 py-1 bg-green-50 rounded-full text-center">
                                                            Access Granted
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => grantConsent(doc.id)}
                                                            disabled={grantingConsentId === doc.id}
                                                            className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-md transition-colors whitespace-nowrap"
                                                        >
                                                            {grantingConsentId === doc.id ? 'Granting...' : 'Grant Access'}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {searchDoctorQuery.length > 2 && doctors.length === 0 && !isSearchingDoctors && (
                                    <p className="text-sm text-gray-500 mt-2">No doctors found matching "{searchDoctorQuery}".</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

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
                                <p><strong>Doctor:</strong> {selectedPrescription.doctor.name}</p>
                                <p><strong>Date:</strong> {new Date(selectedPrescription.createdAt).toLocaleString()}</p>
                                <p><strong>Status:</strong> <span className={`badge badge-${selectedPrescription.status.toLowerCase()}`}>{selectedPrescription.status}</span></p>
                                <p className="text-sm text-muted mt-2">ID: {selectedPrescription.id}</p>
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

                            <button
                                className="btn btn-primary mt-4"
                                onClick={() => setSelectedPrescription(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
