"use client";

import { useState } from "react";
import PatientSearch from "@/components/dashboard/patient/PatientSearch";
import PrescriptionForm from "@/components/prescriptions/PrescriptionForm";
import PastPrescriptions from "@/components/prescriptions/PastPrescriptions";

export default function DoctorDashboardClient() {
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [success, setSuccess] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [cloneData, setCloneData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'prescriptions'>('prescriptions');
    const [patientTab, setPatientTab] = useState<'issue' | 'history'>('issue');

    const handlePrescriptionComplete = () => {
        setSuccess(true);
        setCloneData(null);
        setRefreshKey(prev => prev + 1);
        setPatientTab('history'); // Show history immediately after issuing
        setTimeout(() => setSuccess(false), 5000);
    };

    const handleClone = (prescription: any) => {
        setCloneData(prescription);
        setPatientTab('issue');
    };

    const handleCancel = (id: string) => {
        // Trigger a refresh since child component handled the API call
        setRefreshKey(prev => prev + 1);
    };

    const handlePatientSelect = (patient: any) => {
        setSelectedPatient(patient);
        setCloneData(null); // Reset clone data on new patient
        setPatientTab('issue'); // Default to issue tab when a patient is selected
    };

    const handleLogout = () => {
        window.location.href = '/api/auth/signout';
    };

    return (
        <div className="dashboard-layout">
            <aside className="dashboard-sidebar">
                <div style={{ marginBottom: "2rem" }}>
                    <PatientSearch onSelect={handlePatientSelect} />
                </div>



                <div style={{ marginTop: "auto", paddingTop: "2rem" }}>
                    <button className="sidebar-tab" onClick={handleLogout} style={{ color: "var(--error)" }}>
                        Logout
                    </button>
                </div>
            </aside>

            <main className="dashboard-content">


                <div>
                    {success && <div className="success-message">Prescription issued successfully!</div>}

                    {selectedPatient ? (
                        <>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                                <h2 style={{ margin: 0 }}>
                                    EmedsUser:
                                    <span
                                        style={{ color: "var(--primary)", marginLeft: "0.5rem", marginRight: "0.5rem" }}
                                    >
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
                            </div>

                            {patientTab === 'issue' && (
                                <>
                                    {cloneData ? (
                                        <div className="card text-center" style={{ marginBottom: "2rem", border: "2px solid var(--primary)", background: "var(--bg-main)" }}>
                                            <p style={{ margin: 0, fontWeight: "bold", color: "var(--primary)" }}>
                                                Editing cloned prescription from {new Date(cloneData.createdAt).toLocaleDateString()}
                                            </p>
                                            <button className="btn-logout mt-2" onClick={() => setCloneData(null)} style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}>
                                                Cancel Clone
                                            </button>
                                        </div>
                                    ) : null}

                                    <PrescriptionForm
                                        key={`form-${selectedPatient.id}-${cloneData?.id || 'new'}-${refreshKey}`}
                                        patient={selectedPatient}
                                        onComplete={handlePrescriptionComplete}
                                        initialData={cloneData}
                                    />
                                </>
                            )}

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
                        </>
                    ) : (
                        <div className="card text-center" style={{ padding: "4rem" }}>
                            <p className="text-muted">Select an EmedsUser to start a new prescription</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
