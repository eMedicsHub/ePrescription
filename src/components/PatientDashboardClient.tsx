"use client";

import { useEffect, useState } from "react";

export default function PatientDashboardClient() {
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
    const [records, setRecords] = useState<any[]>([]);
    const [timeline, setTimeline] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<any | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [recordForm, setRecordForm] = useState({
        title: "",
        description: "",
        category: "LAB_REPORT",
        tags: "",
        amount: "",
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Consent management state
    const [consents, setConsents] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [searchDoctorQuery, setSearchDoctorQuery] = useState("");
    const [isSearchingDoctors, setIsSearchingDoctors] = useState(false);
    const [grantingConsentId, setGrantingConsentId] = useState<string | null>(null);
    const [consentDurationDays, setConsentDurationDays] = useState<number>(30);
    const [activeTab, setActiveTab] = useState<'prescriptions' | 'records' | 'timeline' | 'analytics' | 'access'>('timeline');

    useEffect(() => {
        fetchPrescriptions();
        fetchConsents();
        fetchRecords();
        fetchTimeline();
        fetchAnalytics();
    }, []);

    const fetchRecords = async () => {
        try {
            const res = await fetch("/api/patient/records");
            const data = await res.json();
            if (Array.isArray(data)) {
                setRecords(data);
            }
        } catch (err) {
            console.error("Failed to load records", err);
        }
    };

    const fetchTimeline = async () => {
        try {
            const res = await fetch("/api/patient/timeline");
            const data = await res.json();
            if (Array.isArray(data)) {
                setTimeline(data);
            }
        } catch (err) {
            console.error("Failed to load timeline", err);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const res = await fetch("/api/patient/analytics");
            const text = await res.text();
            const data = text ? JSON.parse(text) : null;
            if (res.ok && data) {
                setAnalytics(data);
            } else if (!res.ok) {
                console.error("Failed to load analytics", data);
            }
        } catch (err) {
            console.error("Failed to load analytics", err);
        }
    };

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
                body: JSON.stringify({ doctorId, durationDays: consentDurationDays })
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

    const handleRecordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);
        setUploadError("");

        try {
            const formData = new FormData();
            formData.append("title", recordForm.title);
            formData.append("description", recordForm.description);
            formData.append("category", recordForm.category);
            formData.append("tags", recordForm.tags);
            if (recordForm.amount) {
                formData.append("amount", recordForm.amount);
            }
            if (selectedFile) {
                formData.append("file", selectedFile);
            }

            const res = await fetch("/api/patient/records", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) {
                setUploadError(data.error || "Failed to save record");
                return;
            }

            setRecordForm({
                title: "",
                description: "",
                category: "LAB_REPORT",
                tags: "",
                amount: "",
            });
            setSelectedFile(null);
            await Promise.all([fetchRecords(), fetchTimeline(), fetchAnalytics()]);
        } catch (err) {
            console.error(err);
            setUploadError("Failed to save record");
        } finally {
            setUploading(false);
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
                    className={`sidebar-tab ${activeTab === 'records' ? 'active' : ''}`}
                    onClick={() => setActiveTab('records')}
                >
                    My Records
                </button>
                <button
                    className={`sidebar-tab ${activeTab === 'timeline' ? 'active' : ''}`}
                    onClick={() => setActiveTab('timeline')}
                >
                    Health Timeline
                </button>
                <button
                    className={`sidebar-tab ${activeTab === 'analytics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('analytics')}
                >
                    Insights
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
                        {analytics && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">Prescriptions</p>
                                    <p className="text-2xl font-bold text-slate-900 mt-1">{analytics.prescriptionCount}</p>
                                </div>
                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">Records</p>
                                    <p className="text-2xl font-bold text-slate-900 mt-1">{records.length}</p>
                                </div>
                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">Doctors Linked</p>
                                    <p className="text-2xl font-bold text-slate-900 mt-1">{analytics.activeDoctorCount}</p>
                                </div>
                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">Expiring Soon</p>
                                    <p className="text-2xl font-bold text-slate-900 mt-1">{analytics.expiringSoon}</p>
                                </div>
                            </div>
                        )}

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

                {activeTab === 'records' && (
                    <div className="card">
                        <h3 className="mb-4">My Health Records</h3>
                        <p className="text-sm text-muted mb-6">Upload reports, consultation notes, medical bills, or other records. Files are stored securely and added to your timeline.</p>

                        <form onSubmit={handleRecordSubmit} className="space-y-4">
                            {uploadError && <div className="error-message">{uploadError}</div>}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="input-group">
                                    <label>Title</label>
                                    <input value={recordForm.title} onChange={(e) => setRecordForm((current) => ({ ...current, title: e.target.value }))} required />
                                </div>
                                <div className="input-group">
                                    <label>Category</label>
                                    <select value={recordForm.category} onChange={(e) => setRecordForm((current) => ({ ...current, category: e.target.value }))}>
                                        <option value="LAB_REPORT">Lab Report</option>
                                        <option value="IMAGING">Imaging</option>
                                        <option value="CONSULTATION_NOTE">Consultation Note</option>
                                        <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                                        <option value="MEDICAL_BILL">Medical Bill</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Tags</label>
                                    <input value={recordForm.tags} onChange={(e) => setRecordForm((current) => ({ ...current, tags: e.target.value }))} placeholder="cardiology, annual-checkup" />
                                </div>
                                <div className="input-group">
                                    <label>Bill Amount</label>
                                    <input value={recordForm.amount} onChange={(e) => setRecordForm((current) => ({ ...current, amount: e.target.value }))} placeholder="Optional, for bills only" />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Description</label>
                                <textarea value={recordForm.description} onChange={(e) => setRecordForm((current) => ({ ...current, description: e.target.value }))} rows={3} />
                            </div>

                            <div className="input-group">
                                <label>File</label>
                                <input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={uploading}>
                                {uploading ? "Saving Record..." : "Save Record"}
                            </button>
                        </form>

                        <div className="mt-6" style={{ display: "grid", gap: "1rem" }}>
                            {records.map((record) => (
                                <div key={record.id} className="list-item">
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 600 }}>{record.title}</p>
                                            <p className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>
                                                {record.category.replaceAll("_", " ")} • {new Date(record.occurredAt).toLocaleDateString()} • {record.sourcePortal === 'DOCTOR' ? `Added by Dr. ${record.doctor?.name || record.createdBy?.name}` : 'Added by you'}
                                            </p>
                                            {record.description && <p className="text-sm mt-2">{record.description}</p>}
                                        </div>
                                        {record.storagePath && (
                                            <a href={`/api/patient/records/${record.id}/download`} className="text-sm font-semibold" target="_blank" rel="noreferrer">
                                                Open File
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'timeline' && (
                    <div className="card">
                        <h3 className="mb-4">Health Timeline</h3>
                        <div style={{ display: "grid", gap: "1rem" }}>
                            {timeline.map((entry) => (
                                <div key={entry.id} className="list-item">
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 600 }}>{entry.title}</p>
                                            <p className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>{entry.summary}</p>
                                        </div>
                                        <span className="text-sm text-muted">{new Date(entry.occurredAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                            {timeline.length === 0 && <p className="text-muted">Your timeline is empty.</p>}
                        </div>
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="card">
                        <h3 className="mb-4">Insights</h3>
                        {!analytics ? (
                            <p className="text-muted">Loading analytics...</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                                    <h4 className="mb-2">Prescription Status</h4>
                                    {Object.entries(analytics.statusCounts || {}).map(([status, count]) => (
                                        <p key={status} className="text-sm text-slate-700">{status}: {String(count)}</p>
                                    ))}
                                </div>
                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                                    <h4 className="mb-2">Record Categories</h4>
                                    {Object.entries(analytics.categoryCounts || {}).map(([category, count]) => (
                                        <p key={category} className="text-sm text-slate-700">{category.replaceAll('_', ' ')}: {String(count)}</p>
                                    ))}
                                </div>
                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                                    <h4 className="mb-2">Medical Bills</h4>
                                    <p className="text-2xl font-bold text-slate-900">${Number(analytics.totalMedicalBills || 0).toFixed(2)}</p>
                                </div>
                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                                    <h4 className="mb-2">Active Doctor Connections</h4>
                                    <p className="text-2xl font-bold text-slate-900">{analytics.activeDoctorCount}</p>
                                </div>
                            </div>
                        )}
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
                                                    <p className="text-xs text-gray-500">
                                                        {consent.expiresAt
                                                            ? `Access expires ${new Date(consent.expiresAt).toLocaleDateString()}`
                                                            : "No expiry"}
                                                    </p>
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
                                <div className="input-group" style={{ marginBottom: "0.75rem" }}>
                                    <label>Access Duration</label>
                                    <select
                                        value={consentDurationDays}
                                        onChange={(e) => setConsentDurationDays(Number(e.target.value))}
                                    >
                                        <option value={7}>7 days</option>
                                        <option value={30}>30 days</option>
                                        <option value={90}>90 days</option>
                                        <option value={180}>180 days</option>
                                    </select>
                                </div>
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
