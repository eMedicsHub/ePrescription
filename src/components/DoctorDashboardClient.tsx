"use client";

import { useState } from "react";
import PatientSearch from "./PatientSearch";
import PrescriptionForm from "./PrescriptionForm";
import PastPrescriptions from "./PastPrescriptions";
import TemplateManager from "./TemplateManager";
import { Users, Stethoscope } from "lucide-react";

type TemplateData = {
    name: string;
    medications: { name: string; dosage: string; frequency: string; duration: string }[];
};

export default function DoctorDashboardClient() {
    const [activeService, setActiveService] = useState<'patient' | 'doctor'>('patient');
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [success, setSuccess] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [cloneData, setCloneData] = useState<any>(null);
    const [templateData, setTemplateData] = useState<TemplateData | null>(null);
    const [patientTab, setPatientTab] = useState<'issue' | 'history' | 'templates'>('issue');

    const handlePrescriptionComplete = () => {
        setSuccess(true);
        setCloneData(null);
        setTemplateData(null);
        setRefreshKey(prev => prev + 1);
        setPatientTab('history');
        setTimeout(() => setSuccess(false), 5000);
    };

    const handleClone = (prescription: any) => {
        setCloneData(prescription);
        setTemplateData(null);
        setPatientTab('issue');
    };

    const handleCancel = (_id: string) => {
        setRefreshKey(prev => prev + 1);
    };

    const handlePatientSelect = (patient: any) => {
        setSelectedPatient(patient);
        setCloneData(null);
        setTemplateData(null);
        setPatientTab('issue');
    };

    const handleUseTemplate = (data: TemplateData) => {
        setCloneData(null);
        setTemplateData(data);
        setActiveService('patient');
        setPatientTab('issue');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleLogout = () => {
        window.location.href = '/api/auth/signout';
    };

    const formInitialData = cloneData
        ? { medications: cloneData.medications, notes: cloneData.notes }
        : templateData
        ? { medications: templateData.medications }
        : undefined;

    const formKey = `form-${selectedPatient?.id}-${cloneData?.id || templateData?.name || 'new'}-${refreshKey}`;

    return (
        <div>
            {/* Service Navigation */}
            <div className="service-nav-container">
                <div className="service-nav">
                    <button
                        className={`service-nav-btn ${activeService === 'patient' ? 'active' : ''}`}
                        onClick={() => setActiveService('patient')}
                    >
                        <Users size={18} />
                        Patient Services
                    </button>
                    <button
                        className={`service-nav-btn ${activeService === 'doctor' ? 'active' : ''}`}
                        onClick={() => setActiveService('doctor')}
                    >
                        <Stethoscope size={18} />
                        Doctor Services
                    </button>
                </div>
            </div>

            {activeService === 'patient' ? (
                <div className="dashboard-layout">
                    <aside className="dashboard-sidebar">
                        <div style={{ marginBottom: "1.5rem" }}>
                            <PatientSearch onSelect={handlePatientSelect} />
                        </div>
                        <div style={{ marginTop: "auto", paddingTop: "2rem" }}>
                            <button className="sidebar-tab" onClick={handleLogout} style={{ color: "var(--error)" }}>
                                Logout
                            </button>
                        </div>
                    </aside>

                    <main className="dashboard-content">
                        {success && <div className="success-message">Prescription issued successfully!</div>}

                        {selectedPatient ? (
                            <>
                                {/* Patient header */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                                    <h2 style={{ margin: 0 }}>
                                        Patient:
                                        <span style={{ color: "var(--primary)", marginLeft: "0.5rem", marginRight: "0.5rem" }}>
                                            {selectedPatient.user.name}
                                        </span>
                                        <span style={{ fontSize: "1.2rem", fontWeight: "normal", color: "var(--text-muted)" }}>
                                            (ID: {selectedPatient.universalId})
                                        </span>
                                        <span style={{ fontSize: "1.2rem", fontWeight: "normal", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                                            (DOB: {new Date(selectedPatient.dob).toLocaleDateString()})
                                        </span>
                                    </h2>
                                </div>

                                {/* Tabs */}
                                <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
                                    <button
                                        className={`sidebar-tab ${patientTab === 'issue' ? 'active' : ''}`}
                                        style={{ width: "auto", padding: "0.5rem 1rem" }}
                                        onClick={() => setPatientTab('issue')}
                                    >
                                        Issue Prescription
                                    </button>
                                    <button
                                        className={`sidebar-tab ${patientTab === 'history' ? 'active' : ''}`}
                                        style={{ width: "auto", padding: "0.5rem 1rem" }}
                                        onClick={() => setPatientTab('history')}
                                    >
                                        Prescription History
                                    </button>
                                    <button
                                        className={`sidebar-tab ${patientTab === 'templates' ? 'active' : ''}`}
                                        style={{ width: "auto", padding: "0.5rem 1rem" }}
                                        onClick={() => setPatientTab('templates')}
                                    >
                                        Use Template
                                    </button>
                                </div>

                                {/* Issue tab */}
                                {patientTab === 'issue' && (
                                    <>
                                        {/* Clone banner */}
                                        {cloneData && (
                                            <div className="card text-center" style={{ marginBottom: "1.5rem", border: "2px solid var(--primary)", background: "var(--bg-main)" }}>
                                                <p style={{ margin: 0, fontWeight: "bold", color: "var(--primary)" }}>
                                                    Editing cloned prescription from {new Date(cloneData.createdAt).toLocaleDateString()}
                                                </p>
                                                <button
                                                    className="btn-logout mt-2"
                                                    onClick={() => setCloneData(null)}
                                                    style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                        )}

                                        {/* Template banner */}
                                        {templateData && !cloneData && (
                                            <div
                                                className="card text-center"
                                                style={{
                                                    marginBottom: "1.5rem",
                                                    border: "2px solid #10b981",
                                                    background: "#f0fdf4",
                                                }}
                                            >
                                                <p style={{ margin: 0, fontWeight: "bold", color: "#059669" }}>
                                                    📋 Loaded from template: <em>{templateData.name}</em> — edit as needed before issuing
                                                </p>
                                                <button
                                                    className="btn-logout mt-2"
                                                    onClick={() => setTemplateData(null)}
                                                    style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                        )}

                                        <PrescriptionForm
                                            key={formKey}
                                            patient={selectedPatient}
                                            onComplete={handlePrescriptionComplete}
                                            initialData={formInitialData}
                                        />
                                    </>
                                )}

                                {/* History tab */}
                                {patientTab === 'history' && (
                                    <div style={{ marginTop: "1rem" }}>
                                        <PastPrescriptions
                                            key={`past-${selectedPatient.id}-${refreshKey}`}
                                            patientId={selectedPatient.id}
                                            onClone={handleClone}
                                            onCancel={handleCancel}
                                        />
                                    </div>
                                )}

                                {/* Templates tab */}
                                {patientTab === 'templates' && (
                                    <div style={{ marginTop: "1rem" }}>
                                        <TemplateManager selectMode={true} onUseTemplate={handleUseTemplate} />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="card text-center" style={{ padding: "4rem" }}>
                                {templateData ? (
                                    <div>
                                        <p style={{ fontWeight: "bold", color: "#059669", marginBottom: "0.5rem" }}>
                                            📋 Template &quot;{templateData.name}&quot; loaded
                                        </p>
                                        <p className="text-muted">Search for a patient on the left to issue the prescription.</p>
                                    </div>
                                ) : (
                                    <p className="text-muted">Select a patient on the left to start a new prescription</p>
                                )}
                            </div>
                        )}
                    </main>
                </div>
            ) : (
                <div className="dashboard-layout">
                    <aside className="dashboard-sidebar">
                        <div style={{ marginTop: "auto", paddingTop: "2rem" }}>
                            <button className="sidebar-tab" onClick={handleLogout} style={{ color: "var(--error)" }}>
                                Logout
                            </button>
                        </div>
                    </aside>
                    <main className="dashboard-content">
                        <div className="template-manager-full">
                            <TemplateManager />
                        </div>
                    </main>
                </div>
            )}
        </div>
    );
}
