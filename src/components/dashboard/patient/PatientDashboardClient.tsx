"use client";

import { useEffect, useState } from "react";

type PatientTab = "overview" | "records" | "timeline" | "prescriptions" | "insights" | "access";

const tabMeta: Array<{ id: PatientTab; label: string; eyebrow: string; description: string }> = [
    { id: "overview", label: "Overview", eyebrow: "Today", description: "See your health summary, recent activity, and quick actions at a glance." },
    { id: "records", label: "Records", eyebrow: "Library", description: "" },
    { id: "timeline", label: "Timeline", eyebrow: "History", description: "Review your full medical story in order." },
    { id: "prescriptions", label: "Prescriptions", eyebrow: "Medicines", description: "Track active and past prescriptions with doctor context." },
    { id: "insights", label: "Insights", eyebrow: "Patterns", description: "Understand your prescription trends, records mix, and upcoming expiries." },
    { id: "access", label: "Doctor Access", eyebrow: "Sharing", description: "Control which doctors can view your complete history and for how long." },
];

const categoryLabelMap: Record<string, string> = {
    PRESCRIPTION: "Prescription",
    LAB_REPORT: "Lab Report",
    IMAGING: "Imaging",
    CONSULTATION_NOTE: "Consultation Note",
    DISCHARGE_SUMMARY: "Discharge Summary",
    MEDICAL_BILL: "Medical Bill",
    OTHER: "Other",
};

function formatDate(value: string | Date) {
    return new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatDateTime(value: string | Date) {
    return new Date(value).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    }).format(value);
}

function getTimelineAccent(kind: string) {
    if (kind === "PRESCRIPTION") return "patient-timeline-prescription";
    if (kind === "RECORD") return "patient-timeline-record";
    return "patient-timeline-access";
}

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
        reportDate: "",
        reports: "",
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [consents, setConsents] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [searchDoctorQuery, setSearchDoctorQuery] = useState("");
    const [isSearchingDoctors, setIsSearchingDoctors] = useState(false);
    const [grantingConsentId, setGrantingConsentId] = useState<string | null>(null);
    const [consentDurationDays, setConsentDurationDays] = useState<number>(30);
    const [activeTab, setActiveTab] = useState<PatientTab>("overview");

    useEffect(() => {
        fetchPrescriptions();
        fetchConsents();
        fetchRecords();
        fetchTimeline();
        fetchAnalytics();
    }, []);

    const parseJsonResponse = async (res: Response) => {
        const text = await res.text();
        return text ? JSON.parse(text) : null;
    };

    const fetchRecords = async () => {
        try {
            const res = await fetch("/api/patient/records");
            const data = await parseJsonResponse(res);
            setRecords(res.ok && Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load records", err);
        }
    };

    const fetchTimeline = async () => {
        try {
            const res = await fetch("/api/patient/timeline");
            const data = await parseJsonResponse(res);
            setTimeline(res.ok && Array.isArray(data) ? data : []);
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
                console.error("Failed to load analytics", data?.error || res.status);
                setAnalytics({
                    prescriptionCount: prescriptions.length,
                    statusCounts: {},
                    categoryCounts: {},
                    totalMedicalBills: 0,
                    activeDoctorCount: consents.length,
                    expiringSoon: 0,
                });
            }
        } catch (err) {
            console.error("Failed to load analytics", err);
            setAnalytics({
                prescriptionCount: prescriptions.length,
                statusCounts: {},
                categoryCounts: {},
                totalMedicalBills: 0,
                activeDoctorCount: consents.length,
                expiringSoon: 0,
            });
        }
    };

    const fetchConsents = async () => {
        try {
            const res = await fetch("/api/consents");
            const data = await parseJsonResponse(res);
            setConsents(res.ok && Array.isArray(data) ? data : []);
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
            const data = await parseJsonResponse(res);
            setDoctors(res.ok && Array.isArray(data) ? data : []);
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
            const data = await parseJsonResponse(res);
            if (res.ok && Array.isArray(data)) {
                setPrescriptions(data);
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
            if (recordForm.amount) formData.append("amount", recordForm.amount);
            if (recordForm.reportDate) formData.append("reportDate", recordForm.reportDate);
            if (recordForm.reports) formData.append("reports", recordForm.reports);
            if (selectedFile) formData.append("file", selectedFile);

            const res = await fetch("/api/patient/records", {
                method: "POST",
                body: formData,
            });

            const data = await parseJsonResponse(res);
            if (!res.ok) {
                setUploadError(data?.error || "Failed to save record");
                return;
            }

            setRecordForm({
                title: "",
                description: "",
                category: "LAB_REPORT",
                tags: "",
                amount: "",
                reportDate: "",
                reports: "",
            });
            setSelectedFile(null);
            await Promise.all([fetchRecords(), fetchTimeline(), fetchAnalytics()]);
            setActiveTab("records");
        } catch (err) {
            console.error(err);
            setUploadError("Failed to save record");
        } finally {
            setUploading(false);
        }
    };

    const handleLogout = () => {
        window.location.href = "/api/auth/signout";
    };

    const recentRecords = records.slice(0, 4);
    const recentPrescriptions = prescriptions.slice(0, 4);
    const recentTimeline = timeline.slice(0, 6);
    const totalBills = Number(analytics?.totalMedicalBills || 0);
    const activePrescriptions = prescriptions.filter((p) => p.status === "PENDING").length;
    const latestEntry = timeline[0];
    const latestRecord = records[0];
    const currentTabMeta = tabMeta.find((tab) => tab.id === activeTab) ?? tabMeta[0];
    const isLabReport = recordForm.category === "LAB_REPORT";
    const isMedicalBill = recordForm.category === "MEDICAL_BILL";

    return (
        <div className="patient-portal-shell">
            <section className="patient-hero">
                <div className="patient-hero-copy">
                    <div className="patient-hero-badge">eMeds Tracker</div>
                    <h1>Health Overview</h1>
                    <div className="patient-hero-actions">
                        <button className="patient-action-primary" onClick={() => setActiveTab("records")}>
                            Add a health record
                        </button>
                        <button className="patient-action-secondary" onClick={() => setActiveTab("timeline")}>
                            View my timeline
                        </button>
                    </div>
                </div>
                <div className="patient-hero-panel">
                    <div className="patient-hero-panel-label">Current snapshot</div>
                    <div className="patient-hero-stats">
                        <div className="patient-stat-card">
                            <span>Records saved</span>
                            <strong>{records.length}</strong>
                        </div>
                        <div className="patient-stat-card">
                            <span>Active prescriptions</span>
                            <strong>{activePrescriptions}</strong>
                        </div>
                        <div className="patient-stat-card">
                            <span>Doctors connected</span>
                            <strong>{analytics?.activeDoctorCount ?? consents.length}</strong>
                        </div>
                        <div className="patient-stat-card">
                            <span>Bills tracked</span>
                            <strong>{formatCurrency(totalBills)}</strong>
                        </div>
                    </div>
                    <div className="patient-hero-footnote">
                        {latestEntry ? `Latest activity: ${latestEntry.title} on ${formatDate(latestEntry.occurredAt)}` : ""}
                    </div>
                </div>
            </section>

            <div className="patient-dashboard-grid">
                <aside className="patient-sidebar">
                    <div className="patient-sidebar-card">
                        <div className="patient-sidebar-title">Workspace</div>
                        <div className="patient-sidebar-subtitle">Choose how you want to manage your health information today.</div>
                        <div className="patient-nav-list">
                            {tabMeta.map((tab) => (
                                <button
                                    key={tab.id}
                                    className={`patient-nav-button ${activeTab === tab.id ? "active" : ""}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    <span className="patient-nav-eyebrow">{tab.eyebrow}</span>
                                    <span className="patient-nav-label">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="patient-sidebar-card patient-sidebar-mini">
                        <div className="patient-sidebar-title">At a glance</div>
                        <div className="patient-sidebar-kpis">
                            <div>
                                <span>Expiring soon</span>
                                <strong>{analytics?.expiringSoon ?? 0}</strong>
                            </div>
                            <div>
                                <span>Last record</span>
                                <strong>{latestRecord ? formatDate(latestRecord.occurredAt) : "None"}</strong>
                            </div>
                        </div>
                    </div>

                    <button className="patient-logout-button" onClick={handleLogout}>
                        Sign out
                    </button>
                </aside>

                <main className="patient-main">
                    <section className="patient-section-header">
                        <div>
                            <div className="patient-section-eyebrow">{currentTabMeta.eyebrow}</div>
                            <h2>{currentTabMeta.label}</h2>
                        </div>
                        <p>{currentTabMeta.description}</p>
                    </section>

                    {activeTab === "overview" && (
                        <div className="patient-section-stack">
                            <section className="patient-metrics-grid">
                                <article className="patient-metric-panel patient-metric-primary">
                                    <span className="patient-metric-label">Complete record set</span>
                                    <strong>{records.length + prescriptions.length}</strong>
                                    <p>Combined records and prescriptions available for future appointments and follow-ups.</p>
                                </article>
                                <article className="patient-metric-panel">
                                    <span className="patient-metric-label">Prescription count</span>
                                    <strong>{analytics?.prescriptionCount ?? prescriptions.length}</strong>
                                    <p>Includes current and historical prescriptions issued to you.</p>
                                </article>
                                <article className="patient-metric-panel">
                                    <span className="patient-metric-label">Doctors with access</span>
                                    <strong>{analytics?.activeDoctorCount ?? consents.length}</strong>
                                    <p>Keep sharing intentional by reviewing and revoking access anytime.</p>
                                </article>
                                <article className="patient-metric-panel">
                                    <span className="patient-metric-label">Bills tracked</span>
                                    <strong>{formatCurrency(totalBills)}</strong>
                                    <p>Medical bill totals pulled from your uploaded billing records.</p>
                                </article>
                            </section>

                            <section className="patient-overview-grid">
                                <article className="card patient-feature-card">
                                    <div className="patient-card-topline">Recent timeline</div>
                                    <h3>What changed in your care recently</h3>
                                    <div className="patient-activity-list">
                                        {recentTimeline.length === 0 && <p className="patient-empty-text">Your timeline will come alive as you upload records and receive prescriptions.</p>}
                                        {recentTimeline.map((entry) => (
                                            <div key={entry.id} className="patient-activity-item">
                                                <span className={`patient-activity-dot ${getTimelineAccent(entry.kind)}`} />
                                                <div>
                                                    <strong>{entry.title}</strong>
                                                    <p>{entry.summary}</p>
                                                </div>
                                                <time>{formatDate(entry.occurredAt)}</time>
                                            </div>
                                        ))}
                                    </div>
                                </article>

                                <article className="card patient-feature-card patient-quick-upload">
                                    <div className="patient-card-topline">Quick capture</div>
                                    <h3>Add a new health record</h3>
                                    <p>Use this fast form to keep bills, scan reports, discharge notes, and imaging in one easy archive.</p>

                                    <form onSubmit={handleRecordSubmit} className="patient-record-form">
                                        {uploadError && <div className="error-message">{uploadError}</div>}

                                        <div className="patient-form-grid">
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
                                        </div>

                                        {isLabReport && (
                                            <div className="patient-form-grid">
                                                <div className="input-group">
                                                    <label>Report Date</label>
                                                    <input
                                                        type="date"
                                                        value={recordForm.reportDate}
                                                        onChange={(e) => setRecordForm((current) => ({ ...current, reportDate: e.target.value }))}
                                                        required
                                                    />
                                                </div>
                                                <div className="input-group">
                                                    <label>Reports in File</label>
                                                    <textarea
                                                        value={recordForm.reports}
                                                        onChange={(e) => setRecordForm((current) => ({ ...current, reports: e.target.value }))}
                                                        rows={3}
                                                        placeholder={"CBC\nLipid Profile\nThyroid Panel"}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="input-group">
                                            <label>Description</label>
                                            <textarea value={recordForm.description} onChange={(e) => setRecordForm((current) => ({ ...current, description: e.target.value }))} rows={3} />
                                        </div>

                                        <div className="input-group">
                                            <label>Tags</label>
                                            <input value={recordForm.tags} onChange={(e) => setRecordForm((current) => ({ ...current, tags: e.target.value }))} placeholder="allergy, annual-checkup" />
                                        </div>

                                        {isMedicalBill && (
                                            <div className="input-group">
                                                <label>Bill Amount</label>
                                                <input
                                                    value={recordForm.amount}
                                                    onChange={(e) => setRecordForm((current) => ({ ...current, amount: e.target.value }))}
                                                    placeholder="Enter the billed amount"
                                                />
                                            </div>
                                        )}

                                        <div className="input-group">
                                            <label>Attach File</label>
                                            <input key={`overview-file-${recordForm.category}`} type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                                        </div>

                                        <button type="submit" className="patient-action-primary" disabled={uploading}>
                                            {uploading ? "Saving record..." : "Save to history"}
                                        </button>
                                    </form>
                                </article>
                            </section>

                            <section className="patient-overview-grid">
                                <article className="card patient-feature-card">
                                    <div className="patient-card-topline">Prescription library</div>
                                    <h3>Recent prescriptions</h3>
                                    <div className="patient-simple-list">
                                        {recentPrescriptions.length === 0 && <p className="patient-empty-text">No prescriptions on file yet.</p>}
                                        {recentPrescriptions.map((prescription) => (
                                            <button key={prescription.id} className="patient-list-row" onClick={() => setSelectedPrescription(prescription)}>
                                                <div>
                                                    <strong>{prescription.doctor.name}</strong>
                                                    <p>{prescription.medications.length} medication(s) - {formatDate(prescription.createdAt)}</p>
                                                </div>
                                                <span className={`badge badge-${prescription.status.toLowerCase()}`}>{prescription.status}</span>
                                            </button>
                                        ))}
                                    </div>
                                </article>

                                <article className="card patient-feature-card">
                                    <div className="patient-card-topline">Record categories</div>
                                    <h3>Your archive mix</h3>
                                    <div className="patient-category-grid">
                                        {Object.entries(analytics?.categoryCounts || {}).length === 0 && <p className="patient-empty-text">Upload a few records to see your archive breakdown.</p>}
                                        {Object.entries(analytics?.categoryCounts || {}).map(([category, count]) => (
                                            <div key={category} className="patient-category-chip">
                                                <span>{categoryLabelMap[category] || category}</span>
                                                <strong>{String(count)}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </article>
                            </section>
                        </div>
                    )}

                    {activeTab === "records" && (
                        <div className="patient-section-stack">
                            <section className="patient-records-layout">
                                <article className="card patient-feature-card">
                                    <div className="patient-card-topline">Add to history</div>
                                    <h3>Upload a Record</h3>
                                    <p className="patient-helper-text"></p>

                                    <form onSubmit={handleRecordSubmit} className="patient-record-form">
                                        {uploadError && <div className="error-message">{uploadError}</div>}

                                        <div className="patient-form-grid">
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
                                        </div>
                                        {isLabReport && (
                                            <div className="patient-form-grid">
                                                <div className="input-group">
                                                    <label>Report Date</label>
                                                    <input
                                                        type="date"
                                                        value={recordForm.reportDate}
                                                        onChange={(e) => setRecordForm((current) => ({ ...current, reportDate: e.target.value }))}
                                                        required
                                                    />
                                                </div>
                                                <div className="input-group">
                                                    <label>Reports in File</label>
                                                    <textarea
                                                        value={recordForm.reports}
                                                        onChange={(e) => setRecordForm((current) => ({ ...current, reports: e.target.value }))}
                                                        rows={3}
                                                        placeholder={"CBC\nLipid Profile\nThyroid Panel"}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div className="input-group">
                                            <label>Description</label>
                                            <textarea value={recordForm.description} onChange={(e) => setRecordForm((current) => ({ ...current, description: e.target.value }))} rows={4} />
                                        </div>
                                        <div className="input-group">
                                            <label>Tags</label>
                                            <input value={recordForm.tags} onChange={(e) => setRecordForm((current) => ({ ...current, tags: e.target.value }))} placeholder="bloodwork, orthopedics" />
                                        </div>
                                        {isMedicalBill && (
                                            <div className="input-group">
                                                <label>Bill Amount</label>
                                                <input
                                                    value={recordForm.amount}
                                                    onChange={(e) => setRecordForm((current) => ({ ...current, amount: e.target.value }))}
                                                    placeholder="Enter the billed amount"
                                                />
                                            </div>
                                        )}
                                        <div className="input-group">
                                            <label>File</label>
                                            <input key={`records-file-${recordForm.category}`} type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                                        </div>

                                        <button type="submit" className="patient-action-primary" disabled={uploading}>
                                            {uploading ? "Saving record..." : "Save record"}
                                        </button>
                                    </form>
                                </article>

                                <article className="card patient-feature-card">
                                    <div className="patient-card-topline">Library</div>
                                    <h3>Your stored health documents</h3>
                                    <div className="patient-record-list">
                                        {records.length === 0 && <p className="patient-empty-text">No health records added yet.</p>}
                                        {records.map((record) => (
                                            <div key={record.id} className="patient-record-card">
                                                <div className="patient-record-header">
                                                    <div>
                                                        <strong>{record.title}</strong>
                                                        <p>
                                                            {categoryLabelMap[record.category] || record.category}
                                                            {" - "}
                                                            {formatDate(record.reportDate || record.occurredAt)}
                                                        </p>
                                                    </div>
                                                    <span className="patient-record-origin">
                                                        {record.sourcePortal === "DOCTOR" ? `Added by Dr. ${record.doctor?.name || record.createdBy?.name}` : "Added by you"}
                                                    </span>
                                                </div>
                                                {record.category === "LAB_REPORT" && record.reportDate && (
                                                    <p className="patient-record-description">Report date: {formatDate(record.reportDate)}</p>
                                                )}
                                                {record.category === "LAB_REPORT" && Array.isArray(record.reports) && record.reports.length > 0 && (
                                                    <div className="patient-tag-list">
                                                        {record.reports.map((reportName: string) => (
                                                            <span key={reportName} className="patient-tag patient-tag-highlight">{reportName}</span>
                                                        ))}
                                                    </div>
                                                )}
                                                {record.description && <p className="patient-record-description">{record.description}</p>}
                                                <div className="patient-record-footer">
                                                    <div className="patient-tag-list">
                                                        {(record.tags || []).map((tag: string) => (
                                                            <span key={tag} className="patient-tag">{tag}</span>
                                                        ))}
                                                        {record.amount && <span className="patient-tag patient-tag-highlight">{formatCurrency(Number(record.amount))}</span>}
                                                    </div>
                                                    {record.storagePath && (
                                                        <a href={`/api/patient/records/${record.id}/download`} target="_blank" rel="noreferrer" className="patient-inline-link">
                                                            Open file
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </article>
                            </section>
                        </div>
                    )}

                    {activeTab === "timeline" && (
                        <section className="card patient-feature-card">
                            <div className="patient-card-topline">Chronology</div>
                            <h3>Your medical journey in order</h3>
                            <div className="patient-timeline">
                                {timeline.length === 0 && <p className="patient-empty-text">Your timeline is empty right now.</p>}
                                {timeline.map((entry) => (
                                    <div key={entry.id} className="patient-timeline-item">
                                        <div className={`patient-timeline-marker ${getTimelineAccent(entry.kind)}`} />
                                        <div className="patient-timeline-card">
                                            <div className="patient-timeline-top">
                                                <div>
                                                    <strong>{entry.title}</strong>
                                                    <p>{entry.summary}</p>
                                                </div>
                                                <time>{formatDate(entry.occurredAt)}</time>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {activeTab === "prescriptions" && (
                        <section className="patient-section-stack">
                            <article className="card patient-feature-card">
                                <div className="patient-card-topline">Medicines</div>
                                <h3>Prescription history</h3>
                                {loading && <p className="patient-empty-text">Loading your prescriptions...</p>}
                                {error && <div className="error-message">{error}</div>}
                                {!loading && prescriptions.length === 0 && <p className="patient-empty-text">You have no prescriptions on file.</p>}

                                <div className="patient-prescription-grid">
                                    {prescriptions.map((prescription) => (
                                        <button key={prescription.id} className="patient-prescription-card" onClick={() => setSelectedPrescription(prescription)}>
                                            <div className="patient-prescription-top">
                                                <span>{formatDate(prescription.createdAt)}</span>
                                                <span className={`badge badge-${prescription.status.toLowerCase()}`}>{prescription.status}</span>
                                            </div>
                                            <strong>{prescription.doctor.name}</strong>
                                            <p>{prescription.medications.length} medication(s)</p>
                                            <div className="patient-inline-link">Open details</div>
                                        </button>
                                    ))}
                                </div>
                            </article>
                        </section>
                    )}

                    {activeTab === "insights" && (
                        <section className="patient-insights-grid">
                            <article className="card patient-feature-card">
                                <div className="patient-card-topline">Status overview</div>
                                <h3>Prescription status mix</h3>
                                <div className="patient-insight-list">
                                    {Object.entries(analytics?.statusCounts || {}).length === 0 && <p className="patient-empty-text">Prescription insights will appear here as your history grows.</p>}
                                    {Object.entries(analytics?.statusCounts || {}).map(([status, count]) => (
                                        <div key={status} className="patient-insight-row">
                                            <span>{status}</span>
                                            <strong>{String(count)}</strong>
                                        </div>
                                    ))}
                                </div>
                            </article>

                            <article className="card patient-feature-card">
                                <div className="patient-card-topline">Record patterns</div>
                                <h3>What fills your archive</h3>
                                <div className="patient-insight-list">
                                    {Object.entries(analytics?.categoryCounts || {}).length === 0 && <p className="patient-empty-text">Add records to start seeing category patterns.</p>}
                                    {Object.entries(analytics?.categoryCounts || {}).map(([category, count]) => (
                                        <div key={category} className="patient-insight-row">
                                            <span>{categoryLabelMap[category] || category}</span>
                                            <strong>{String(count)}</strong>
                                        </div>
                                    ))}
                                </div>
                            </article>

                            <article className="card patient-feature-card">
                                <div className="patient-card-topline">Financial snapshot</div>
                                <h3>Medical bills tracked</h3>
                                <div className="patient-big-number">{formatCurrency(totalBills)}</div>
                                <p className="patient-helper-text">Useful for reimbursements, insurance follow-up, and personal budgeting.</p>
                            </article>

                            <article className="card patient-feature-card">
                                <div className="patient-card-topline">Upcoming attention</div>
                                <h3>Items to review soon</h3>
                                <div className="patient-big-number">{analytics?.expiringSoon ?? 0}</div>
                                <p className="patient-helper-text">Pending prescriptions close to expiry appear here so you can act early.</p>
                            </article>
                        </section>
                    )}

                    {activeTab === "access" && (
                        <section className="patient-access-layout">
                            <article className="card patient-feature-card">
                                <div className="patient-card-topline">Current access</div>
                                <h3>Doctors who can view your full history</h3>
                                <div className="patient-consent-list">
                                    {consents.length === 0 && <p className="patient-empty-text">You have not granted full-history access to any doctors yet.</p>}
                                    {consents.map((consent) => (
                                        <div key={consent.id} className="patient-consent-card">
                                            <div>
                                                <strong>{consent.doctor.name}</strong>
                                                <p>{consent.doctor.email}</p>
                                                <span>{consent.expiresAt ? `Access expires ${formatDate(consent.expiresAt)}` : "No expiry"}</span>
                                            </div>
                                            <button onClick={() => revokeConsent(consent.id)} className="patient-revoke-button">
                                                Revoke
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </article>

                            <article className="card patient-feature-card">
                                <div className="patient-card-topline">Grant access</div>
                                <h3>Find a doctor and share safely</h3>
                                <p className="patient-helper-text">
                                    Sharing access helps your doctor see the bigger picture beyond prescriptions they personally issued.
                                </p>

                                <div className="input-group">
                                    <label>Access Duration</label>
                                    <select value={consentDurationDays} onChange={(e) => setConsentDurationDays(Number(e.target.value))}>
                                        <option value={7}>7 days</option>
                                        <option value={30}>30 days</option>
                                        <option value={90}>90 days</option>
                                        <option value={180}>180 days</option>
                                    </select>
                                </div>

                                <div className="patient-search-shell">
                                    <input
                                        type="text"
                                        placeholder="Search doctor by name or email..."
                                        value={searchDoctorQuery}
                                        onChange={(e) => setSearchDoctorQuery(e.target.value)}
                                    />
                                    {isSearchingDoctors && <span>Searching...</span>}
                                </div>

                                <div className="patient-doctor-results">
                                    {doctors.map((doc) => {
                                        const hasConsent = consents.some((consent) => consent.doctor.id === doc.id);
                                        return (
                                            <div key={doc.id} className="patient-doctor-result">
                                                <div>
                                                    <strong>{doc.name}</strong>
                                                    <p>{doc.email}</p>
                                                </div>
                                                {hasConsent ? (
                                                    <span className="patient-granted-pill">Access granted</span>
                                                ) : (
                                                    <button
                                                        onClick={() => grantConsent(doc.id)}
                                                        disabled={grantingConsentId === doc.id}
                                                        className="patient-action-primary"
                                                    >
                                                        {grantingConsentId === doc.id ? "Granting..." : "Grant access"}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {searchDoctorQuery.length > 2 && doctors.length === 0 && !isSearchingDoctors && (
                                        <p className="patient-empty-text">No doctors found matching "{searchDoctorQuery}".</p>
                                    )}
                                </div>
                            </article>
                        </section>
                    )}
                </main>
            </div>

            {selectedPrescription && (
                <div className="patient-modal-backdrop" onClick={() => setSelectedPrescription(null)}>
                    <div className="card patient-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="patient-modal-top">
                            <div>
                                <div className="patient-card-topline">Prescription details</div>
                                <h3>{selectedPrescription.doctor.name}</h3>
                            </div>
                            <button className="btn-logout" onClick={() => setSelectedPrescription(null)}>
                                Close
                            </button>
                        </div>

                        <div className="patient-modal-summary">
                            <div>
                                <span>Date issued</span>
                                <strong>{formatDateTime(selectedPrescription.createdAt)}</strong>
                            </div>
                            <div>
                                <span>Status</span>
                                <strong>{selectedPrescription.status}</strong>
                            </div>
                            <div>
                                <span>Prescription ID</span>
                                <strong>{selectedPrescription.id}</strong>
                            </div>
                        </div>

                        <div className="patient-medication-list">
                            {selectedPrescription.medications.map((med: any) => (
                                <div key={med.id} className="patient-medication-card">
                                    <strong>{med.name}</strong>
                                    <p>{med.dosage}</p>
                                    <span>{med.frequency} - {med.duration}</span>
                                </div>
                            ))}
                        </div>

                        {selectedPrescription.notes && (
                            <div className="patient-notes-block">
                                <div className="patient-card-topline">Doctor notes</div>
                                <p>{selectedPrescription.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
