"use client";

import { useEffect, useState } from "react";

type PatientTab = "overview" | "records" | "timeline" | "prescriptions" | "insights" | "health" | "access";
type LabResultRow = { testProfile: string; test: string; result: string; flag: string; refLow: string; refHigh: string };

const tabMeta: Array<{ id: PatientTab; label: string; eyebrow: string; description: string }> = [
    { id: "overview", label: "Overview", eyebrow: "Today", description: "See your health summary, recent activity, and quick actions at a glance." },
    { id: "records", label: "Records", eyebrow: "Library", description: "" },
    { id: "timeline", label: "Timeline", eyebrow: "History", description: "Review your full medical story in order." },
    { id: "prescriptions", label: "Prescriptions", eyebrow: "Medicines", description: "Track active and past prescriptions with doctor context." },
    { id: "insights", label: "Insights", eyebrow: "Patterns", description: "Understand your prescription trends, records mix, and upcoming expiries." },
    { id: "health", label: "Health Profile", eyebrow: "Vitals", description: "Track your profile, vitals, allergies, conditions, and emergency contacts." },
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

const createEmptyLabResult = (): LabResultRow => ({
    testProfile: "",
    test: "",
    result: "",
    flag: "",
    refLow: "",
    refHigh: "",
});

const lipidProfileTemplate: LabResultRow[] = [
    { testProfile: "SERUM LIPID PROFILE", test: "SERUM CHOLESTEROL - TOTAL", result: "253.5 mg/dL", flag: "H", refLow: "140.0", refHigh: "239.0" },
    { testProfile: "SERUM LIPID PROFILE", test: "SERUM TRIGLYCERIDES", result: "181.0 mg/dL", flag: "-", refLow: "10.0", refHigh: "200.0" },
    { testProfile: "SERUM LIPID PROFILE", test: "CHOLESTEROL-H.D.L.", result: "44.6 mg/dL", flag: "-", refLow: "35.0", refHigh: "85.0" },
    { testProfile: "SERUM LIPID PROFILE", test: "CHOLESTEROL - NON - H.D.L", result: "208.9 mg/dL", flag: "H", refLow: "55.0", refHigh: "189.0" },
    { testProfile: "SERUM LIPID PROFILE", test: "CHOLESTEROL L.D.L", result: "172.7 mg/dL", flag: "H", refLow: "40.0", refHigh: "159.0" },
    { testProfile: "SERUM LIPID PROFILE", test: "CHOLESTEROL - VLDL", result: "36.2 mg/dL", flag: "-", refLow: "10.0", refHigh: "41.0" },
    { testProfile: "SERUM LIPID PROFILE", test: "CHOL/HDL", result: "5.6", flag: "H", refLow: "2.0", refHigh: "5.0" },
    { testProfile: "SERUM LIPID PROFILE", test: "LDL / HDL", result: "3.87", flag: "H", refLow: "0.01", refHigh: "3.30" },
];

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

function extractFirstNumber(value: string) {
    const match = String(value || "").match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : null;
}

function getDerivedLabFlag(row: LabResultRow) {
    const resultNumber = extractFirstNumber(row.result);
    const refLowNumber = extractFirstNumber(row.refLow);
    const refHighNumber = extractFirstNumber(row.refHigh);
    if (resultNumber !== null && refLowNumber !== null && resultNumber < refLowNumber) {
        return "L";
    }
    if (resultNumber !== null && refHighNumber !== null && resultNumber > refHighNumber) {
        return "H";
    }
    if (resultNumber !== null && refLowNumber !== null && refHighNumber !== null) {
        return "N";
    }
    return String(row.flag || "").trim().toUpperCase() || "-";
}

function isInRangeFlag(flag: string) {
    return flag === "N" || flag === "-";
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
    const [labResults, setLabResults] = useState<LabResultRow[]>([createEmptyLabResult()]);
    const [consents, setConsents] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [searchDoctorQuery, setSearchDoctorQuery] = useState("");
    const [isSearchingDoctors, setIsSearchingDoctors] = useState(false);
    const [grantingConsentId, setGrantingConsentId] = useState<string | null>(null);
    const [consentDurationDays, setConsentDurationDays] = useState<number>(30);
    const [activeTab, setActiveTab] = useState<PatientTab>("overview");
    const [patientVitals, setPatientVitals] = useState<any[]>([]);
    const [patientAllergies, setPatientAllergies] = useState<any[]>([]);
    const [patientConditions, setPatientConditions] = useState<any[]>([]);
    const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);
    const [immunizations, setImmunizations] = useState<any[]>([]);
    const [surgeries, setSurgeries] = useState<any[]>([]);
    const [familyHistory, setFamilyHistory] = useState<any[]>([]);
    const [insurancePolicies, setInsurancePolicies] = useState<any[]>([]);
    const [carePlans, setCarePlans] = useState<any[]>([]);
    const [lifestyle, setLifestyle] = useState<any | null>(null);
    const [medSchedules, setMedSchedules] = useState<any[]>([]);
    const [medLogs, setMedLogs] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [ocrJobs, setOcrJobs] = useState<any[]>([]);
    const [healthError, setHealthError] = useState("");
    const [savingHealth, setSavingHealth] = useState(false);
    const [editingVitalId, setEditingVitalId] = useState<string | null>(null);
    const [editingAllergyId, setEditingAllergyId] = useState<string | null>(null);
    const [editingConditionId, setEditingConditionId] = useState<string | null>(null);
    const [editingContactId, setEditingContactId] = useState<string | null>(null);
    const [vitalForm, setVitalForm] = useState({
        weightKg: "",
        heightCm: "",
        systolicBp: "",
        diastolicBp: "",
        pulseBpm: "",
        spo2Percent: "",
    });
    const [allergyForm, setAllergyForm] = useState({
        allergen: "",
        category: "OTHER",
        severity: "",
        reaction: "",
    });
    const [conditionForm, setConditionForm] = useState({
        name: "",
        icd10Code: "",
        status: "ACTIVE",
        diagnosedAt: "",
    });
    const [contactForm, setContactForm] = useState({
        name: "",
        relationship: "",
        phone: "",
        email: "",
        isPrimary: true,
    });
    const [immunizationForm, setImmunizationForm] = useState({ vaccine: "", doseNumber: "", administeredAt: "" });
    const [surgeryForm, setSurgeryForm] = useState({ procedureName: "", surgeryDate: "", hospital: "" });
    const [familyHistoryForm, setFamilyHistoryForm] = useState({ relation: "", condition: "", status: "PRESENT" });
    const [insuranceForm, setInsuranceForm] = useState({ provider: "", planName: "", memberId: "", policyNumber: "", isPrimary: false });
    const [carePlanForm, setCarePlanForm] = useState({ title: "", goal: "", status: "ACTIVE", targetReviewAt: "" });
    const [lifestyleForm, setLifestyleForm] = useState({ smokingStatus: "", alcoholUse: "", activityLevel: "", dietPreference: "", sleepHours: "", stressLevel: "" });
    const [scheduleForm, setScheduleForm] = useState({ medicationName: "", frequency: "", dosage: "", timesPerDay: "1", reminderTimes: "08:00,20:00" });
    const [adherenceForm, setAdherenceForm] = useState({ scheduleId: "", scheduledFor: "", status: "TAKEN" });
    const [appointmentForm, setAppointmentForm] = useState({ title: "", appointmentAt: "", location: "", followUpDate: "" });
    const [ocrFile, setOcrFile] = useState<File | null>(null);

    useEffect(() => {
        fetchPrescriptions();
        fetchConsents();
        fetchRecords();
        fetchTimeline();
        fetchAnalytics();
        fetchHealthData();
    }, []);

    const parseJsonResponse = async (res: Response) => {
        const text = await res.text();
        if (!text) {
            return null;
        }
        try {
            return JSON.parse(text);
        } catch {
            return null;
        }
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

    const fetchHealthData = async () => {
        try {
            const [vitalsRes, allergiesRes, conditionsRes, contactsRes, immunizationsRes, surgeriesRes, familyHistoryRes, insuranceRes, carePlansRes, lifestyleRes, schedulesRes, logsRes, appointmentsRes, ocrJobsRes] = await Promise.all([
                fetch("/api/patient/vitals"),
                fetch("/api/patient/allergies"),
                fetch("/api/patient/conditions"),
                fetch("/api/patient/emergency-contacts"),
                fetch("/api/patient/immunizations"),
                fetch("/api/patient/surgeries"),
                fetch("/api/patient/family-history"),
                fetch("/api/patient/insurance"),
                fetch("/api/patient/care-plans"),
                fetch("/api/patient/lifestyle"),
                fetch("/api/patient/adherence/schedules"),
                fetch("/api/patient/adherence/logs"),
                fetch("/api/patient/appointments"),
                fetch("/api/patient/ocr/imports"),
            ]);
            const [vitals, allergies, conditions, contacts, immunizationRows, surgeryRows, familyRows, insuranceRows, planRows, lifestyleRow, scheduleRows, logRows, appointmentRows, importRows] = await Promise.all([
                parseJsonResponse(vitalsRes),
                parseJsonResponse(allergiesRes),
                parseJsonResponse(conditionsRes),
                parseJsonResponse(contactsRes),
                parseJsonResponse(immunizationsRes),
                parseJsonResponse(surgeriesRes),
                parseJsonResponse(familyHistoryRes),
                parseJsonResponse(insuranceRes),
                parseJsonResponse(carePlansRes),
                parseJsonResponse(lifestyleRes),
                parseJsonResponse(schedulesRes),
                parseJsonResponse(logsRes),
                parseJsonResponse(appointmentsRes),
                parseJsonResponse(ocrJobsRes),
            ]);
            setPatientVitals(vitalsRes.ok && Array.isArray(vitals) ? vitals : []);
            setPatientAllergies(allergiesRes.ok && Array.isArray(allergies) ? allergies : []);
            setPatientConditions(conditionsRes.ok && Array.isArray(conditions) ? conditions : []);
            setEmergencyContacts(contactsRes.ok && Array.isArray(contacts) ? contacts : []);
            setImmunizations(immunizationsRes.ok && Array.isArray(immunizationRows) ? immunizationRows : []);
            setSurgeries(surgeriesRes.ok && Array.isArray(surgeryRows) ? surgeryRows : []);
            setFamilyHistory(familyHistoryRes.ok && Array.isArray(familyRows) ? familyRows : []);
            setInsurancePolicies(insuranceRes.ok && Array.isArray(insuranceRows) ? insuranceRows : []);
            setCarePlans(carePlansRes.ok && Array.isArray(planRows) ? planRows : []);
            setLifestyle(lifestyleRes.ok ? lifestyleRow : null);
            setMedSchedules(schedulesRes.ok && Array.isArray(scheduleRows) ? scheduleRows : []);
            setMedLogs(logsRes.ok && Array.isArray(logRows) ? logRows : []);
            setAppointments(appointmentsRes.ok && Array.isArray(appointmentRows) ? appointmentRows : []);
            setOcrJobs(ocrJobsRes.ok && Array.isArray(importRows) ? importRows : []);
            if (lifestyleRes.ok && lifestyleRow) {
                setLifestyleForm({
                    smokingStatus: lifestyleRow.smokingStatus || "",
                    alcoholUse: lifestyleRow.alcoholUse || "",
                    activityLevel: lifestyleRow.activityLevel || "",
                    dietPreference: lifestyleRow.dietPreference || "",
                    sleepHours: lifestyleRow.sleepHours == null ? "" : String(lifestyleRow.sleepHours),
                    stressLevel: lifestyleRow.stressLevel || "",
                });
            }
        } catch (err) {
            console.error("Failed to load health profile", err);
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

    const submitVital = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingHealth(true);
        setHealthError("");
        try {
            const res = await fetch("/api/patient/vitals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(vitalForm),
            });
            const data = await parseJsonResponse(res);
            if (!res.ok) {
                setHealthError(data?.error || "Failed to save vital");
                return;
            }
            setVitalForm({ weightKg: "", heightCm: "", systolicBp: "", diastolicBp: "", pulseBpm: "", spo2Percent: "" });
            await fetchHealthData();
        } finally {
            setSavingHealth(false);
        }
    };

    const submitAllergy = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingHealth(true);
        setHealthError("");
        try {
            const payload = { ...allergyForm, severity: allergyForm.severity || null };
            const res = await fetch("/api/patient/allergies", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await parseJsonResponse(res);
            if (!res.ok) {
                setHealthError(data?.error || "Failed to save allergy");
                return;
            }
            setAllergyForm({ allergen: "", category: "OTHER", severity: "", reaction: "" });
            await fetchHealthData();
        } finally {
            setSavingHealth(false);
        }
    };

    const submitCondition = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingHealth(true);
        setHealthError("");
        try {
            const payload = { ...conditionForm, diagnosedAt: conditionForm.diagnosedAt || null };
            const res = await fetch("/api/patient/conditions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await parseJsonResponse(res);
            if (!res.ok) {
                setHealthError(data?.error || "Failed to save condition");
                return;
            }
            setConditionForm({ name: "", icd10Code: "", status: "ACTIVE", diagnosedAt: "" });
            await fetchHealthData();
        } finally {
            setSavingHealth(false);
        }
    };

    const submitEmergencyContact = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingHealth(true);
        setHealthError("");
        try {
            const res = await fetch("/api/patient/emergency-contacts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(contactForm),
            });
            const data = await parseJsonResponse(res);
            if (!res.ok) {
                setHealthError(data?.error || "Failed to save emergency contact");
                return;
            }
            setContactForm({ name: "", relationship: "", phone: "", email: "", isPrimary: false });
            await fetchHealthData();
        } finally {
            setSavingHealth(false);
        }
    };

    const updateHealthItem = async (endpoint: string, id: string, payload: Record<string, unknown>, errorLabel: string) => {
        const res = await fetch(`/api/patient/${endpoint}?id=${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await parseJsonResponse(res);
        if (!res.ok) {
            setHealthError(data?.error || errorLabel);
            return false;
        }
        await fetchHealthData();
        return true;
    };

    const deleteHealthItem = async (endpoint: string, id: string, label: string) => {
        if (!confirm(`Delete this ${label}?`)) return;
        const res = await fetch(`/api/patient/${endpoint}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        const data = await parseJsonResponse(res);
        if (!res.ok) {
            setHealthError(data?.error || `Failed to delete ${label}`);
            return;
        }
        await fetchHealthData();
    };

    const submitImmunization = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingHealth(true);
        setHealthError("");
        try {
            const res = await fetch("/api/patient/immunizations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(immunizationForm),
            });
            const data = await parseJsonResponse(res);
            if (!res.ok) {
                setHealthError(data?.error || "Failed to save immunization");
                return;
            }
            setImmunizationForm({ vaccine: "", doseNumber: "", administeredAt: "" });
            await fetchHealthData();
        } finally {
            setSavingHealth(false);
        }
    };

    const submitSurgery = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingHealth(true);
        setHealthError("");
        try {
            const res = await fetch("/api/patient/surgeries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(surgeryForm),
            });
            const data = await parseJsonResponse(res);
            if (!res.ok) {
                setHealthError(data?.error || "Failed to save surgery");
                return;
            }
            setSurgeryForm({ procedureName: "", surgeryDate: "", hospital: "" });
            await fetchHealthData();
        } finally {
            setSavingHealth(false);
        }
    };

    const submitFamilyHistory = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingHealth(true);
        setHealthError("");
        try {
            const res = await fetch("/api/patient/family-history", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(familyHistoryForm),
            });
            const data = await parseJsonResponse(res);
            if (!res.ok) {
                setHealthError(data?.error || "Failed to save family history");
                return;
            }
            setFamilyHistoryForm({ relation: "", condition: "", status: "PRESENT" });
            await fetchHealthData();
        } finally {
            setSavingHealth(false);
        }
    };

    const submitInsurance = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingHealth(true);
        setHealthError("");
        try {
            const res = await fetch("/api/patient/insurance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(insuranceForm),
            });
            const data = await parseJsonResponse(res);
            if (!res.ok) {
                setHealthError(data?.error || "Failed to save insurance");
                return;
            }
            setInsuranceForm({ provider: "", planName: "", memberId: "", policyNumber: "", isPrimary: false });
            await fetchHealthData();
        } finally {
            setSavingHealth(false);
        }
    };

    const submitCarePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingHealth(true);
        setHealthError("");
        try {
            const res = await fetch("/api/patient/care-plans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(carePlanForm),
            });
            const data = await parseJsonResponse(res);
            if (!res.ok) {
                setHealthError(data?.error || "Failed to save care plan");
                return;
            }
            setCarePlanForm({ title: "", goal: "", status: "ACTIVE", targetReviewAt: "" });
            await fetchHealthData();
        } finally {
            setSavingHealth(false);
        }
    };

    const saveLifestyle = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingHealth(true);
        setHealthError("");
        try {
            const res = await fetch("/api/patient/lifestyle", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(lifestyleForm),
            });
            const data = await parseJsonResponse(res);
            if (!res.ok) {
                setHealthError(data?.error || "Failed to save lifestyle profile");
                return;
            }
            setLifestyle(data);
        } finally {
            setSavingHealth(false);
        }
    };

    const submitSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingHealth(true);
        setHealthError("");
        try {
            const reminderTimes = scheduleForm.reminderTimes.split(",").map((s) => s.trim()).filter(Boolean);
            const res = await fetch("/api/patient/adherence/schedules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    medicationName: scheduleForm.medicationName,
                    frequency: scheduleForm.frequency,
                    dosage: scheduleForm.dosage,
                    timesPerDay: Number(scheduleForm.timesPerDay || "1"),
                    reminderTimes,
                }),
            });
            const data = await parseJsonResponse(res);
            if (!res.ok) {
                setHealthError(data?.error || "Failed to save medication schedule");
                return;
            }
            setScheduleForm({ medicationName: "", frequency: "", dosage: "", timesPerDay: "1", reminderTimes: "08:00,20:00" });
            await fetchHealthData();
        } finally {
            setSavingHealth(false);
        }
    };

    const submitAdherenceLog = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingHealth(true);
        setHealthError("");
        try {
            const res = await fetch("/api/patient/adherence/logs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(adherenceForm),
            });
            const data = await parseJsonResponse(res);
            if (!res.ok) {
                setHealthError(data?.error || "Failed to log adherence");
                return;
            }
            setAdherenceForm((current) => ({ ...current, scheduledFor: "" }));
            await fetchHealthData();
        } finally {
            setSavingHealth(false);
        }
    };

    const submitAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingHealth(true);
        setHealthError("");
        try {
            const res = await fetch("/api/patient/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(appointmentForm),
            });
            const data = await parseJsonResponse(res);
            if (!res.ok) {
                setHealthError(data?.error || "Failed to save appointment");
                return;
            }
            setAppointmentForm({ title: "", appointmentAt: "", location: "", followUpDate: "" });
            await fetchHealthData();
        } finally {
            setSavingHealth(false);
        }
    };

    const submitOcrImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ocrFile) {
            setHealthError("Please choose a file for OCR import");
            return;
        }
        setSavingHealth(true);
        setHealthError("");
        try {
            const fd = new FormData();
            fd.append("file", ocrFile);
            const res = await fetch("/api/patient/ocr/imports", { method: "POST", body: fd });
            const data = await parseJsonResponse(res);
            if (!res.ok) {
                setHealthError(data?.error || "Failed OCR import");
                return;
            }
            setOcrFile(null);
            await fetchHealthData();
        } finally {
            setSavingHealth(false);
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
            if (isLabReport) {
                const normalizedLabResults = labResults.map((row) => ({
                    ...row,
                    flag: getDerivedLabFlag(row),
                }));
                formData.append("labResults", JSON.stringify(normalizedLabResults));
            }
            if (selectedFile) formData.append("file", selectedFile);

            const res = await fetch("/api/patient/records", {
                method: "POST",
                body: formData,
            });

            const data = await parseJsonResponse(res);
            if (!res.ok) {
                setUploadError(data?.error || `Failed to save record (${res.status})`);
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
            setLabResults([createEmptyLabResult()]);
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
    const updateLabResult = (index: number, field: keyof LabResultRow, value: string) => {
        setLabResults((current) => current.map((row, rowIndex) => (
            rowIndex === index ? { ...row, [field]: value } : row
        )));
    };
    const addLabResultRow = () => setLabResults((current) => [...current, createEmptyLabResult()]);
    const removeLabResultRow = (index: number) => {
        setLabResults((current) => (
            current.length === 1 ? [createEmptyLabResult()] : current.filter((_, rowIndex) => rowIndex !== index)
        ));
    };
    const loadLipidProfileTemplate = () => {
        setRecordForm((current) => ({
            ...current,
            title: current.title || "SERUM LIPID PROFILE",
            reports: current.reports || "SERUM LIPID PROFILE",
        }));
        setLabResults(lipidProfileTemplate.map((row) => ({ ...row })));
    };

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
                                <article className="card patient-feature-card patient-records-form-card">
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

                                    <form onSubmit={handleRecordSubmit} className="patient-record-form patient-records-page-form">
                                        {uploadError && <div className="error-message">{uploadError}</div>}

                                        <div className={`patient-form-grid ${isLabReport ? "patient-form-grid-three patient-records-top-grid" : ""}`}>
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
                                            <>
                                                <div className="patient-form-grid patient-form-grid-three patient-records-meta-grid">
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
                                                            placeholder={"Lipid Profile\nCBC\nThyroid Panel"}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="input-group">
                                                    <label>Lab Result Table</label>
                                                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                                                        <button type="button" className="patient-action-secondary" onClick={loadLipidProfileTemplate}>
                                                            Load Lipid Profile Template
                                                        </button>
                                                        <button type="button" className="patient-action-secondary" onClick={addLabResultRow}>
                                                            Add Row
                                                        </button>
                                                    </div>
                                                    <div style={{ overflowX: "hidden" }}>
                                                        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: "0.88rem" }}>
                                                            <colgroup>
                                                                <col style={{ width: "21%" }} />
                                                                <col style={{ width: "29%" }} />
                                                                <col style={{ width: "12%" }} />
                                                                <col style={{ width: "7%" }} />
                                                                <col style={{ width: "11%" }} />
                                                                <col style={{ width: "11%" }} />
                                                                <col style={{ width: "9%" }} />
                                                            </colgroup>
                                                            <thead>
                                                                <tr>
                                                                    <th style={{ textAlign: "left", padding: "0.5rem 0.35rem" }}>Test Profile</th>
                                                                    <th style={{ textAlign: "left", padding: "0.5rem 0.35rem" }}>Test</th>
                                                                    <th style={{ textAlign: "left", padding: "0.5rem 0.35rem" }}>Result</th>
                                                                    <th style={{ textAlign: "center", padding: "0.5rem 0.35rem" }}>Flag</th>
                                                                    <th style={{ textAlign: "left", padding: "0.5rem 0.35rem" }}>Ref Low</th>
                                                                    <th style={{ textAlign: "left", padding: "0.5rem 0.35rem" }}>Ref High</th>
                                                                    <th style={{ padding: "0.5rem 0.35rem" }} />
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {labResults.map((row, index) => (
                                                                    <tr key={`overview-lab-row-${index}`}>
                                                                        <td style={{ padding: "0.35rem" }}>
                                                                            <input value={row.testProfile} onChange={(e) => updateLabResult(index, "testProfile", e.target.value)} placeholder="Lipid Profile" />
                                                                        </td>
                                                                        <td style={{ padding: "0.35rem" }}>
                                                                            <input value={row.test} onChange={(e) => updateLabResult(index, "test", e.target.value)} placeholder="SERUM CHOLESTEROL - TOTAL" />
                                                                        </td>
                                                                        <td style={{ padding: "0.35rem" }}>
                                                                            <input value={row.result} onChange={(e) => updateLabResult(index, "result", e.target.value)} placeholder="253.5 mg/dL" />
                                                                        </td>
                                                                        <td style={{ padding: "0.35rem", textAlign: "center" }}>
                                                                            <span style={{ fontWeight: 700, color: isInRangeFlag(getDerivedLabFlag(row)) ? "#15803d" : "#b91c1c" }}>
                                                                                {getDerivedLabFlag(row)}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ padding: "0.35rem" }}>
                                                                            <input value={row.refLow} onChange={(e) => updateLabResult(index, "refLow", e.target.value)} placeholder="140.0" />
                                                                        </td>
                                                                        <td style={{ padding: "0.35rem" }}>
                                                                            <input value={row.refHigh} onChange={(e) => updateLabResult(index, "refHigh", e.target.value)} placeholder="239.0" />
                                                                        </td>
                                                                        <td style={{ padding: "0.35rem" }}>
                                                                            <button type="button" className="patient-revoke-button" onClick={() => removeLabResultRow(index)}>
                                                                                -
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {isLabReport && (
                                            <>
                                                <div className="input-group">
                                                    <label>Description</label>
                                                    <textarea value={recordForm.description} onChange={(e) => setRecordForm((current) => ({ ...current, description: e.target.value }))} rows={3} />
                                                </div>

                                                <div className="input-group">
                                                    <label>Tags</label>
                                                    <input value={recordForm.tags} onChange={(e) => setRecordForm((current) => ({ ...current, tags: e.target.value }))} placeholder="allergy, annual-checkup" />
                                                </div>
                                            </>
                                        )}

                                        {!isLabReport && (
                                            <>
                                                <div className="input-group">
                                                    <label>Description</label>
                                                    <textarea value={recordForm.description} onChange={(e) => setRecordForm((current) => ({ ...current, description: e.target.value }))} rows={3} />
                                                </div>

                                                <div className="input-group">
                                                    <label>Tags</label>
                                                    <input value={recordForm.tags} onChange={(e) => setRecordForm((current) => ({ ...current, tags: e.target.value }))} placeholder="allergy, annual-checkup" />
                                                </div>
                                            </>
                                        )}

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
                                <article className="card patient-feature-card patient-records-library-card">
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
                                <article className="card patient-feature-card patient-records-form-card">
                                    <div className="patient-card-topline">Add to history</div>
                                    <h3>Upload a Record</h3>
                                    <p className="patient-helper-text"></p>

                                    <form onSubmit={handleRecordSubmit} className="patient-record-form">
                                        {uploadError && <div className="error-message">{uploadError}</div>}

                                        <div className={`patient-form-grid ${isLabReport ? "patient-form-grid-three" : ""}`}>
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
                                            {isLabReport && (
                                                <div className="input-group">
                                                    <label>Report Date</label>
                                                    <input
                                                        type="date"
                                                        value={recordForm.reportDate}
                                                        onChange={(e) => setRecordForm((current) => ({ ...current, reportDate: e.target.value }))}
                                                        required
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        {isLabReport && (
                                            <>
                                                <div className="patient-form-grid patient-form-grid-three">
                                                    <div className="input-group">
                                                        <label>Reports in File</label>
                                                        <textarea
                                                            value={recordForm.reports}
                                                            onChange={(e) => setRecordForm((current) => ({ ...current, reports: e.target.value }))}
                                                            rows={3}
                                                            placeholder={"Lipid Profile\nCBC\nThyroid Panel"}
                                                        />
                                                    </div>
                                                    <div className="input-group">
                                                        <label>Description</label>
                                                        <textarea value={recordForm.description} onChange={(e) => setRecordForm((current) => ({ ...current, description: e.target.value }))} rows={3} />
                                                    </div>
                                                    <div className="input-group">
                                                        <label>Tags</label>
                                                        <input value={recordForm.tags} onChange={(e) => setRecordForm((current) => ({ ...current, tags: e.target.value }))} placeholder="bloodwork, orthopedics" />
                                                    </div>
                                                </div>
                                                <div className="input-group patient-records-file-group">
                                                    <label>File</label>
                                                    <input key={`records-file-${recordForm.category}`} type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                                                </div>
                                                <div className="input-group">
                                                    <label>Lab Result Table</label>
                                                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                                                        <button type="button" className="patient-action-secondary" onClick={loadLipidProfileTemplate}>
                                                            Load Lipid Profile Template
                                                        </button>
                                                        <button type="button" className="patient-action-secondary" onClick={addLabResultRow}>
                                                            Add Row
                                                        </button>
                                                    </div>
                                                    <div style={{ overflowX: "hidden" }}>
                                                        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: "0.88rem" }}>
                                                            <colgroup>
                                                                <col style={{ width: "21%" }} />
                                                                <col style={{ width: "29%" }} />
                                                                <col style={{ width: "12%" }} />
                                                                <col style={{ width: "7%" }} />
                                                                <col style={{ width: "11%" }} />
                                                                <col style={{ width: "11%" }} />
                                                                <col style={{ width: "9%" }} />
                                                            </colgroup>
                                                            <thead>
                                                                <tr>
                                                                    <th style={{ textAlign: "left", padding: "0.5rem 0.35rem" }}>Test Profile</th>
                                                                    <th style={{ textAlign: "left", padding: "0.5rem 0.35rem" }}>Test</th>
                                                                    <th style={{ textAlign: "left", padding: "0.5rem 0.35rem" }}>Result</th>
                                                                    <th style={{ textAlign: "center", padding: "0.5rem 0.35rem" }}>Flag</th>
                                                                    <th style={{ textAlign: "left", padding: "0.5rem 0.35rem" }}>Ref Low</th>
                                                                    <th style={{ textAlign: "left", padding: "0.5rem 0.35rem" }}>Ref High</th>
                                                                    <th style={{ padding: "0.5rem 0.35rem" }} />
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {labResults.map((row, index) => (
                                                                    <tr key={`records-lab-row-${index}`}>
                                                                        <td style={{ padding: "0.35rem" }}>
                                                                            <input value={row.testProfile} onChange={(e) => updateLabResult(index, "testProfile", e.target.value)} placeholder="Lipid Profile" />
                                                                        </td>
                                                                        <td style={{ padding: "0.35rem" }}>
                                                                            <input value={row.test} onChange={(e) => updateLabResult(index, "test", e.target.value)} placeholder="SERUM CHOLESTEROL - TOTAL" />
                                                                        </td>
                                                                        <td style={{ padding: "0.35rem" }}>
                                                                            <input value={row.result} onChange={(e) => updateLabResult(index, "result", e.target.value)} placeholder="253.5 mg/dL" />
                                                                        </td>
                                                                        <td style={{ padding: "0.35rem", textAlign: "center" }}>
                                                                            <span style={{ fontWeight: 700, color: isInRangeFlag(getDerivedLabFlag(row)) ? "#15803d" : "#b91c1c" }}>
                                                                                {getDerivedLabFlag(row)}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ padding: "0.35rem" }}>
                                                                            <input value={row.refLow} onChange={(e) => updateLabResult(index, "refLow", e.target.value)} placeholder="140.0" />
                                                                        </td>
                                                                        <td style={{ padding: "0.35rem" }}>
                                                                            <input value={row.refHigh} onChange={(e) => updateLabResult(index, "refHigh", e.target.value)} placeholder="239.0" />
                                                                        </td>
                                                                        <td style={{ padding: "0.35rem" }}>
                                                                            <button type="button" className="patient-revoke-button" onClick={() => removeLabResultRow(index)}>
                                                                                -
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                        {!isLabReport && (
                                            <>
                                                <div className="input-group">
                                                    <label>Description</label>
                                                    <textarea value={recordForm.description} onChange={(e) => setRecordForm((current) => ({ ...current, description: e.target.value }))} rows={4} />
                                                </div>
                                                <div className="input-group">
                                                    <label>Tags</label>
                                                    <input value={recordForm.tags} onChange={(e) => setRecordForm((current) => ({ ...current, tags: e.target.value }))} placeholder="bloodwork, orthopedics" />
                                                </div>
                                            </>
                                        )}
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
                                        {!isLabReport && (
                                            <div className="input-group">
                                                <label>File</label>
                                                <input key={`records-file-${recordForm.category}`} type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                                            </div>
                                        )}

                                        <button type="submit" className="patient-action-primary" disabled={uploading}>
                                            {uploading ? "Saving record..." : "Save record"}
                                        </button>
                                    </form>
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

                    {activeTab === "health" && (
                        <section className="patient-section-stack">
                            {healthError && <div className="error-message">{healthError}</div>}
                            <article className="card patient-feature-card">
                                <div className="patient-card-topline">Snapshot</div>
                                <h3>Add latest vitals</h3>
                                <form onSubmit={submitVital} className="patient-grid-columns">
                                    <div className="input-group">
                                        <label>Weight (kg)</label>
                                        <input value={vitalForm.weightKg} onChange={(e) => setVitalForm((c) => ({ ...c, weightKg: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>Height (cm)</label>
                                        <input value={vitalForm.heightCm} onChange={(e) => setVitalForm((c) => ({ ...c, heightCm: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>Systolic BP</label>
                                        <input value={vitalForm.systolicBp} onChange={(e) => setVitalForm((c) => ({ ...c, systolicBp: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>Diastolic BP</label>
                                        <input value={vitalForm.diastolicBp} onChange={(e) => setVitalForm((c) => ({ ...c, diastolicBp: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>Pulse (bpm)</label>
                                        <input value={vitalForm.pulseBpm} onChange={(e) => setVitalForm((c) => ({ ...c, pulseBpm: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>SpO2 (%)</label>
                                        <input value={vitalForm.spo2Percent} onChange={(e) => setVitalForm((c) => ({ ...c, spo2Percent: e.target.value }))} />
                                    </div>
                                    <button type="submit" className="patient-action-primary" disabled={savingHealth}>{savingHealth ? "Saving..." : "Save vitals"}</button>
                                </form>
                                <div className="patient-insight-list">
                                    {patientVitals.slice(0, 5).map((vital) => (
                                        <div key={vital.id} className="patient-insight-row">
                                            {editingVitalId === vital.id ? (
                                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(100px, 1fr))", gap: "0.4rem", width: "100%" }}>
                                                    <input value={vital.systolicBp ?? ""} onChange={(e) => setPatientVitals((rows) => rows.map((r) => r.id === vital.id ? { ...r, systolicBp: e.target.value } : r))} placeholder="Systolic" />
                                                    <input value={vital.diastolicBp ?? ""} onChange={(e) => setPatientVitals((rows) => rows.map((r) => r.id === vital.id ? { ...r, diastolicBp: e.target.value } : r))} placeholder="Diastolic" />
                                                    <input value={vital.weightKg ?? ""} onChange={(e) => setPatientVitals((rows) => rows.map((r) => r.id === vital.id ? { ...r, weightKg: e.target.value } : r))} placeholder="Weight" />
                                                    <input value={vital.spo2Percent ?? ""} onChange={(e) => setPatientVitals((rows) => rows.map((r) => r.id === vital.id ? { ...r, spo2Percent: e.target.value } : r))} placeholder="SpO2" />
                                                </div>
                                            ) : (
                                                <>
                                                    <span>{formatDate(vital.recordedAt)} - BP {vital.systolicBp ?? "-"} / {vital.diastolicBp ?? "-"}</span>
                                                    <strong>{vital.weightKg ? `${vital.weightKg} kg` : "-"}</strong>
                                                </>
                                            )}
                                            <div style={{ display: "flex", gap: "0.4rem" }}>
                                                {editingVitalId === vital.id ? (
                                                    <>
                                                        <button type="button" className="patient-action-secondary" onClick={async () => {
                                                            const ok = await updateHealthItem("vitals", vital.id, {
                                                                systolicBp: vital.systolicBp,
                                                                diastolicBp: vital.diastolicBp,
                                                                weightKg: vital.weightKg,
                                                                spo2Percent: vital.spo2Percent,
                                                            }, "Failed to update vital");
                                                            if (ok) setEditingVitalId(null);
                                                        }}>Save</button>
                                                        <button type="button" className="patient-action-secondary" onClick={() => { setEditingVitalId(null); fetchHealthData(); }}>Cancel</button>
                                                    </>
                                                ) : (
                                                    <button type="button" className="patient-action-secondary" onClick={() => setEditingVitalId(vital.id)}>Edit</button>
                                                )}
                                                <button type="button" className="patient-revoke-button" onClick={() => deleteHealthItem("vitals", vital.id, "vital")}>-</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </article>

                            <article className="card patient-feature-card">
                                <div className="patient-card-topline">Risk Tracking</div>
                                <h3>Allergies and conditions</h3>
                                <form onSubmit={submitAllergy} className="patient-grid-columns">
                                    <div className="input-group">
                                        <label>Allergen</label>
                                        <input value={allergyForm.allergen} onChange={(e) => setAllergyForm((c) => ({ ...c, allergen: e.target.value }))} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Category</label>
                                        <select value={allergyForm.category} onChange={(e) => setAllergyForm((c) => ({ ...c, category: e.target.value }))}>
                                            <option value="OTHER">Other</option>
                                            <option value="DRUG">Drug</option>
                                            <option value="FOOD">Food</option>
                                            <option value="ENVIRONMENT">Environment</option>
                                            <option value="INSECT">Insect</option>
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Severity</label>
                                        <select value={allergyForm.severity} onChange={(e) => setAllergyForm((c) => ({ ...c, severity: e.target.value }))}>
                                            <option value="">Not set</option>
                                            <option value="MILD">Mild</option>
                                            <option value="MODERATE">Moderate</option>
                                            <option value="SEVERE">Severe</option>
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Reaction</label>
                                        <input value={allergyForm.reaction} onChange={(e) => setAllergyForm((c) => ({ ...c, reaction: e.target.value }))} />
                                    </div>
                                    <button type="submit" className="patient-action-primary" disabled={savingHealth}>{savingHealth ? "Saving..." : "Save allergy"}</button>
                                </form>

                                <form onSubmit={submitCondition} className="patient-grid-columns">
                                    <div className="input-group">
                                        <label>Condition</label>
                                        <input value={conditionForm.name} onChange={(e) => setConditionForm((c) => ({ ...c, name: e.target.value }))} required />
                                    </div>
                                    <div className="input-group">
                                        <label>ICD10</label>
                                        <input value={conditionForm.icd10Code} onChange={(e) => setConditionForm((c) => ({ ...c, icd10Code: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>Status</label>
                                        <select value={conditionForm.status} onChange={(e) => setConditionForm((c) => ({ ...c, status: e.target.value }))}>
                                            <option value="ACTIVE">Active</option>
                                            <option value="IN_REMISSION">In remission</option>
                                            <option value="RESOLVED">Resolved</option>
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Diagnosed on</label>
                                        <input type="date" value={conditionForm.diagnosedAt} onChange={(e) => setConditionForm((c) => ({ ...c, diagnosedAt: e.target.value }))} />
                                    </div>
                                    <button type="submit" className="patient-action-primary" disabled={savingHealth}>{savingHealth ? "Saving..." : "Save condition"}</button>
                                </form>
                                <div className="patient-insight-list">
                                    {patientAllergies.slice(0, 5).map((allergy) => (
                                        <div key={allergy.id} className="patient-insight-row">
                                            {editingAllergyId === allergy.id ? (
                                                <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: "0.4rem", width: "100%" }}>
                                                    <input value={allergy.allergen ?? ""} onChange={(e) => setPatientAllergies((rows) => rows.map((r) => r.id === allergy.id ? { ...r, allergen: e.target.value } : r))} />
                                                    <select value={allergy.category ?? "OTHER"} onChange={(e) => setPatientAllergies((rows) => rows.map((r) => r.id === allergy.id ? { ...r, category: e.target.value } : r))}>
                                                        <option value="OTHER">Other</option>
                                                        <option value="DRUG">Drug</option>
                                                        <option value="FOOD">Food</option>
                                                        <option value="ENVIRONMENT">Environment</option>
                                                        <option value="INSECT">Insect</option>
                                                    </select>
                                                    <select value={allergy.severity ?? ""} onChange={(e) => setPatientAllergies((rows) => rows.map((r) => r.id === allergy.id ? { ...r, severity: e.target.value } : r))}>
                                                        <option value="">Not set</option>
                                                        <option value="MILD">Mild</option>
                                                        <option value="MODERATE">Moderate</option>
                                                        <option value="SEVERE">Severe</option>
                                                    </select>
                                                </div>
                                            ) : (
                                                <>
                                                    <span>{allergy.allergen} ({allergy.category})</span>
                                                    <strong>{allergy.severity || "Not set"}</strong>
                                                </>
                                            )}
                                            <div style={{ display: "flex", gap: "0.4rem" }}>
                                                {editingAllergyId === allergy.id ? (
                                                    <>
                                                        <button type="button" className="patient-action-secondary" onClick={async () => {
                                                            const ok = await updateHealthItem("allergies", allergy.id, {
                                                                allergen: allergy.allergen,
                                                                category: allergy.category,
                                                                severity: allergy.severity,
                                                            }, "Failed to update allergy");
                                                            if (ok) setEditingAllergyId(null);
                                                        }}>Save</button>
                                                        <button type="button" className="patient-action-secondary" onClick={() => { setEditingAllergyId(null); fetchHealthData(); }}>Cancel</button>
                                                    </>
                                                ) : (
                                                    <button type="button" className="patient-action-secondary" onClick={() => setEditingAllergyId(allergy.id)}>Edit</button>
                                                )}
                                                <button type="button" className="patient-revoke-button" onClick={() => deleteHealthItem("allergies", allergy.id, "allergy")}>-</button>
                                            </div>
                                        </div>
                                    ))}
                                    {patientConditions.slice(0, 5).map((condition) => (
                                        <div key={condition.id} className="patient-insight-row">
                                            {editingConditionId === condition.id ? (
                                                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "0.4rem", width: "100%" }}>
                                                    <input value={condition.name ?? ""} onChange={(e) => setPatientConditions((rows) => rows.map((r) => r.id === condition.id ? { ...r, name: e.target.value } : r))} />
                                                    <select value={condition.status ?? "ACTIVE"} onChange={(e) => setPatientConditions((rows) => rows.map((r) => r.id === condition.id ? { ...r, status: e.target.value } : r))}>
                                                        <option value="ACTIVE">Active</option>
                                                        <option value="IN_REMISSION">In remission</option>
                                                        <option value="RESOLVED">Resolved</option>
                                                    </select>
                                                </div>
                                            ) : (
                                                <>
                                                    <span>{condition.name}</span>
                                                    <strong>{condition.status}</strong>
                                                </>
                                            )}
                                            <div style={{ display: "flex", gap: "0.4rem" }}>
                                                {editingConditionId === condition.id ? (
                                                    <>
                                                        <button type="button" className="patient-action-secondary" onClick={async () => {
                                                            const ok = await updateHealthItem("conditions", condition.id, { name: condition.name, status: condition.status }, "Failed to update condition");
                                                            if (ok) setEditingConditionId(null);
                                                        }}>Save</button>
                                                        <button type="button" className="patient-action-secondary" onClick={() => { setEditingConditionId(null); fetchHealthData(); }}>Cancel</button>
                                                    </>
                                                ) : (
                                                    <button type="button" className="patient-action-secondary" onClick={() => setEditingConditionId(condition.id)}>Edit</button>
                                                )}
                                                <button type="button" className="patient-revoke-button" onClick={() => deleteHealthItem("conditions", condition.id, "condition")}>-</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </article>

                            <article className="card patient-feature-card">
                                <div className="patient-card-topline">Safety</div>
                                <h3>Emergency contacts</h3>
                                <form onSubmit={submitEmergencyContact} className="patient-grid-columns">
                                    <div className="input-group">
                                        <label>Name</label>
                                        <input value={contactForm.name} onChange={(e) => setContactForm((c) => ({ ...c, name: e.target.value }))} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Relationship</label>
                                        <input value={contactForm.relationship} onChange={(e) => setContactForm((c) => ({ ...c, relationship: e.target.value }))} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Phone</label>
                                        <input value={contactForm.phone} onChange={(e) => setContactForm((c) => ({ ...c, phone: e.target.value }))} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Email</label>
                                        <input value={contactForm.email} onChange={(e) => setContactForm((c) => ({ ...c, email: e.target.value }))} />
                                    </div>
                                    <div className="input-group" style={{ justifyContent: "end" }}>
                                        <label style={{ display: "flex", gap: "0.45rem", alignItems: "center" }}>
                                            <input
                                                type="checkbox"
                                                checked={contactForm.isPrimary}
                                                onChange={(e) => setContactForm((c) => ({ ...c, isPrimary: e.target.checked }))}
                                            />
                                            Primary contact
                                        </label>
                                    </div>
                                    <button type="submit" className="patient-action-primary" disabled={savingHealth}>{savingHealth ? "Saving..." : "Save contact"}</button>
                                </form>
                                <div className="patient-insight-list">
                                    {emergencyContacts.map((contact) => (
                                        <div key={contact.id} className="patient-insight-row">
                                            {editingContactId === contact.id ? (
                                                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "0.4rem", width: "100%" }}>
                                                    <input value={contact.name ?? ""} onChange={(e) => setEmergencyContacts((rows) => rows.map((r) => r.id === contact.id ? { ...r, name: e.target.value } : r))} />
                                                    <input value={contact.relationship ?? ""} onChange={(e) => setEmergencyContacts((rows) => rows.map((r) => r.id === contact.id ? { ...r, relationship: e.target.value } : r))} />
                                                    <input value={contact.phone ?? ""} onChange={(e) => setEmergencyContacts((rows) => rows.map((r) => r.id === contact.id ? { ...r, phone: e.target.value } : r))} />
                                                </div>
                                            ) : (
                                                <>
                                                    <span>{contact.name} - {contact.relationship}</span>
                                                    <strong>{contact.phone}</strong>
                                                </>
                                            )}
                                            <div style={{ display: "flex", gap: "0.4rem" }}>
                                                {editingContactId === contact.id ? (
                                                    <>
                                                        <button type="button" className="patient-action-secondary" onClick={async () => {
                                                            const ok = await updateHealthItem("emergency-contacts", contact.id, {
                                                                name: contact.name,
                                                                relationship: contact.relationship,
                                                                phone: contact.phone,
                                                            }, "Failed to update contact");
                                                            if (ok) setEditingContactId(null);
                                                        }}>Save</button>
                                                        <button type="button" className="patient-action-secondary" onClick={() => { setEditingContactId(null); fetchHealthData(); }}>Cancel</button>
                                                    </>
                                                ) : (
                                                    <button type="button" className="patient-action-secondary" onClick={() => setEditingContactId(contact.id)}>Edit</button>
                                                )}
                                                <button type="button" className="patient-revoke-button" onClick={() => deleteHealthItem("emergency-contacts", contact.id, "contact")}>-</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </article>

                            <article className="card patient-feature-card">
                                <div className="patient-card-topline">Prevention</div>
                                <h3>Immunizations</h3>
                                <form onSubmit={submitImmunization} className="patient-grid-columns">
                                    <div className="input-group">
                                        <label>Vaccine</label>
                                        <input value={immunizationForm.vaccine} onChange={(e) => setImmunizationForm((c) => ({ ...c, vaccine: e.target.value }))} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Dose</label>
                                        <input value={immunizationForm.doseNumber} onChange={(e) => setImmunizationForm((c) => ({ ...c, doseNumber: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>Administered Date</label>
                                        <input type="date" value={immunizationForm.administeredAt} onChange={(e) => setImmunizationForm((c) => ({ ...c, administeredAt: e.target.value }))} />
                                    </div>
                                    <button type="submit" className="patient-action-primary" disabled={savingHealth}>{savingHealth ? "Saving..." : "Save immunization"}</button>
                                </form>
                                <div className="patient-insight-list">
                                    {immunizations.slice(0, 5).map((item) => (
                                        <div key={item.id} className="patient-insight-row">
                                            <span>{item.vaccine} {item.doseNumber ? `(${item.doseNumber})` : ""}</span>
                                            <strong>{item.administeredAt ? formatDate(item.administeredAt) : "Pending date"}</strong>
                                            <button type="button" className="patient-revoke-button" onClick={() => deleteHealthItem("immunizations", item.id, "immunization")}>-</button>
                                        </div>
                                    ))}
                                </div>
                            </article>

                            <article className="card patient-feature-card">
                                <div className="patient-card-topline">Procedures</div>
                                <h3>Surgeries and interventions</h3>
                                <form onSubmit={submitSurgery} className="patient-grid-columns">
                                    <div className="input-group">
                                        <label>Procedure</label>
                                        <input value={surgeryForm.procedureName} onChange={(e) => setSurgeryForm((c) => ({ ...c, procedureName: e.target.value }))} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Date</label>
                                        <input type="date" value={surgeryForm.surgeryDate} onChange={(e) => setSurgeryForm((c) => ({ ...c, surgeryDate: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>Hospital</label>
                                        <input value={surgeryForm.hospital} onChange={(e) => setSurgeryForm((c) => ({ ...c, hospital: e.target.value }))} />
                                    </div>
                                    <button type="submit" className="patient-action-primary" disabled={savingHealth}>{savingHealth ? "Saving..." : "Save surgery"}</button>
                                </form>
                                <div className="patient-insight-list">
                                    {surgeries.slice(0, 5).map((item) => (
                                        <div key={item.id} className="patient-insight-row">
                                            <span>{item.procedureName}</span>
                                            <strong>{item.surgeryDate ? formatDate(item.surgeryDate) : "Date pending"}</strong>
                                            <button type="button" className="patient-revoke-button" onClick={() => deleteHealthItem("surgeries", item.id, "surgery")}>-</button>
                                        </div>
                                    ))}
                                </div>
                            </article>

                            <article className="card patient-feature-card">
                                <div className="patient-card-topline">Genetics</div>
                                <h3>Family history</h3>
                                <form onSubmit={submitFamilyHistory} className="patient-grid-columns">
                                    <div className="input-group">
                                        <label>Relation</label>
                                        <input value={familyHistoryForm.relation} onChange={(e) => setFamilyHistoryForm((c) => ({ ...c, relation: e.target.value }))} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Condition</label>
                                        <input value={familyHistoryForm.condition} onChange={(e) => setFamilyHistoryForm((c) => ({ ...c, condition: e.target.value }))} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Status</label>
                                        <select value={familyHistoryForm.status} onChange={(e) => setFamilyHistoryForm((c) => ({ ...c, status: e.target.value }))}>
                                            <option value="PRESENT">Present</option>
                                            <option value="SUSPECTED">Suspected</option>
                                            <option value="NEGATIVE">Negative</option>
                                        </select>
                                    </div>
                                    <button type="submit" className="patient-action-primary" disabled={savingHealth}>{savingHealth ? "Saving..." : "Save family history"}</button>
                                </form>
                                <div className="patient-insight-list">
                                    {familyHistory.slice(0, 5).map((item) => (
                                        <div key={item.id} className="patient-insight-row">
                                            <span>{item.relation}: {item.condition}</span>
                                            <strong>{item.status}</strong>
                                            <button type="button" className="patient-revoke-button" onClick={() => deleteHealthItem("family-history", item.id, "family history")}>-</button>
                                        </div>
                                    ))}
                                </div>
                            </article>

                            <article className="card patient-feature-card">
                                <div className="patient-card-topline">Coverage</div>
                                <h3>Insurance policies</h3>
                                <form onSubmit={submitInsurance} className="patient-grid-columns">
                                    <div className="input-group">
                                        <label>Provider</label>
                                        <input value={insuranceForm.provider} onChange={(e) => setInsuranceForm((c) => ({ ...c, provider: e.target.value }))} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Plan</label>
                                        <input value={insuranceForm.planName} onChange={(e) => setInsuranceForm((c) => ({ ...c, planName: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>Member ID</label>
                                        <input value={insuranceForm.memberId} onChange={(e) => setInsuranceForm((c) => ({ ...c, memberId: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>Policy Number</label>
                                        <input value={insuranceForm.policyNumber} onChange={(e) => setInsuranceForm((c) => ({ ...c, policyNumber: e.target.value }))} />
                                    </div>
                                    <div className="input-group" style={{ justifyContent: "end" }}>
                                        <label style={{ display: "flex", gap: "0.45rem", alignItems: "center" }}>
                                            <input type="checkbox" checked={insuranceForm.isPrimary} onChange={(e) => setInsuranceForm((c) => ({ ...c, isPrimary: e.target.checked }))} />
                                            Primary policy
                                        </label>
                                    </div>
                                    <button type="submit" className="patient-action-primary" disabled={savingHealth}>{savingHealth ? "Saving..." : "Save policy"}</button>
                                </form>
                                <div className="patient-insight-list">
                                    {insurancePolicies.slice(0, 5).map((item) => (
                                        <div key={item.id} className="patient-insight-row">
                                            <span>{item.provider} {item.planName ? `- ${item.planName}` : ""}</span>
                                            <strong>{item.isPrimary ? "Primary" : "Secondary"}</strong>
                                            <button type="button" className="patient-revoke-button" onClick={() => deleteHealthItem("insurance", item.id, "insurance policy")}>-</button>
                                        </div>
                                    ))}
                                </div>
                            </article>

                            <article className="card patient-feature-card">
                                <div className="patient-card-topline">Care Coordination</div>
                                <h3>Care plans and goals</h3>
                                <form onSubmit={submitCarePlan} className="patient-grid-columns">
                                    <div className="input-group">
                                        <label>Plan title</label>
                                        <input value={carePlanForm.title} onChange={(e) => setCarePlanForm((c) => ({ ...c, title: e.target.value }))} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Goal</label>
                                        <input value={carePlanForm.goal} onChange={(e) => setCarePlanForm((c) => ({ ...c, goal: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>Status</label>
                                        <select value={carePlanForm.status} onChange={(e) => setCarePlanForm((c) => ({ ...c, status: e.target.value }))}>
                                            <option value="ACTIVE">Active</option>
                                            <option value="PAUSED">Paused</option>
                                            <option value="COMPLETED">Completed</option>
                                            <option value="CANCELLED">Cancelled</option>
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Review date</label>
                                        <input type="date" value={carePlanForm.targetReviewAt} onChange={(e) => setCarePlanForm((c) => ({ ...c, targetReviewAt: e.target.value }))} />
                                    </div>
                                    <button type="submit" className="patient-action-primary" disabled={savingHealth}>{savingHealth ? "Saving..." : "Save plan"}</button>
                                </form>
                                <div className="patient-insight-list">
                                    {carePlans.slice(0, 5).map((item) => (
                                        <div key={item.id} className="patient-insight-row">
                                            <span>{item.title}</span>
                                            <strong>{item.status}</strong>
                                            <button type="button" className="patient-revoke-button" onClick={() => deleteHealthItem("care-plans", item.id, "care plan")}>-</button>
                                        </div>
                                    ))}
                                </div>
                            </article>

                            <article className="card patient-feature-card">
                                <div className="patient-card-topline">Lifestyle</div>
                                <h3>Daily habits profile</h3>
                                <form onSubmit={saveLifestyle} className="patient-grid-columns">
                                    <div className="input-group">
                                        <label>Smoking</label>
                                        <input value={lifestyleForm.smokingStatus} onChange={(e) => setLifestyleForm((c) => ({ ...c, smokingStatus: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>Alcohol</label>
                                        <input value={lifestyleForm.alcoholUse} onChange={(e) => setLifestyleForm((c) => ({ ...c, alcoholUse: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>Activity</label>
                                        <input value={lifestyleForm.activityLevel} onChange={(e) => setLifestyleForm((c) => ({ ...c, activityLevel: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>Diet</label>
                                        <input value={lifestyleForm.dietPreference} onChange={(e) => setLifestyleForm((c) => ({ ...c, dietPreference: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>Sleep Hours</label>
                                        <input value={lifestyleForm.sleepHours} onChange={(e) => setLifestyleForm((c) => ({ ...c, sleepHours: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>Stress</label>
                                        <input value={lifestyleForm.stressLevel} onChange={(e) => setLifestyleForm((c) => ({ ...c, stressLevel: e.target.value }))} />
                                    </div>
                                    <button type="submit" className="patient-action-primary" disabled={savingHealth}>{savingHealth ? "Saving..." : "Save lifestyle"}</button>
                                </form>
                                <p className="patient-helper-text">
                                    Last updated: {lifestyle?.updatedAt ? formatDateTime(lifestyle.updatedAt) : "Not set yet"}
                                </p>
                            </article>

                            <article className="card patient-feature-card">
                                <div className="patient-card-topline">Medication Adherence</div>
                                <h3>Dose reminders and taken/missed logs</h3>
                                <form onSubmit={submitSchedule} className="patient-grid-columns">
                                    <div className="input-group">
                                        <label>Medication</label>
                                        <input value={scheduleForm.medicationName} onChange={(e) => setScheduleForm((c) => ({ ...c, medicationName: e.target.value }))} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Frequency</label>
                                        <input value={scheduleForm.frequency} onChange={(e) => setScheduleForm((c) => ({ ...c, frequency: e.target.value }))} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Dosage</label>
                                        <input value={scheduleForm.dosage} onChange={(e) => setScheduleForm((c) => ({ ...c, dosage: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>Times per day</label>
                                        <input value={scheduleForm.timesPerDay} onChange={(e) => setScheduleForm((c) => ({ ...c, timesPerDay: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>Reminder times (comma separated)</label>
                                        <input value={scheduleForm.reminderTimes} onChange={(e) => setScheduleForm((c) => ({ ...c, reminderTimes: e.target.value }))} />
                                    </div>
                                    <button type="submit" className="patient-action-primary" disabled={savingHealth}>{savingHealth ? "Saving..." : "Save schedule"}</button>
                                </form>

                                <form onSubmit={submitAdherenceLog} className="patient-grid-columns">
                                    <div className="input-group">
                                        <label>Schedule</label>
                                        <select value={adherenceForm.scheduleId} onChange={(e) => setAdherenceForm((c) => ({ ...c, scheduleId: e.target.value }))} required>
                                            <option value="">Select schedule</option>
                                            {medSchedules.map((s) => <option key={s.id} value={s.id}>{s.medicationName} ({s.frequency})</option>)}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Scheduled For</label>
                                        <input type="datetime-local" value={adherenceForm.scheduledFor} onChange={(e) => setAdherenceForm((c) => ({ ...c, scheduledFor: e.target.value }))} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Status</label>
                                        <select value={adherenceForm.status} onChange={(e) => setAdherenceForm((c) => ({ ...c, status: e.target.value }))}>
                                            <option value="TAKEN">Taken</option>
                                            <option value="MISSED">Missed</option>
                                            <option value="SKIPPED">Skipped</option>
                                        </select>
                                    </div>
                                    <button type="submit" className="patient-action-primary" disabled={savingHealth}>{savingHealth ? "Saving..." : "Log dose"}</button>
                                </form>
                                <div className="patient-insight-list">
                                    {medLogs.slice(0, 8).map((log) => (
                                        <div key={log.id} className="patient-insight-row">
                                            <span>{formatDateTime(log.scheduledFor)} - {log.status}</span>
                                            <strong>{log.takenAt ? formatDateTime(log.takenAt) : "-"}</strong>
                                        </div>
                                    ))}
                                </div>
                            </article>

                            <article className="card patient-feature-card">
                                <div className="patient-card-topline">Appointments</div>
                                <h3>Visits, notes, and follow-up reminders</h3>
                                <form onSubmit={submitAppointment} className="patient-grid-columns">
                                    <div className="input-group">
                                        <label>Title</label>
                                        <input value={appointmentForm.title} onChange={(e) => setAppointmentForm((c) => ({ ...c, title: e.target.value }))} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Appointment Date</label>
                                        <input type="datetime-local" value={appointmentForm.appointmentAt} onChange={(e) => setAppointmentForm((c) => ({ ...c, appointmentAt: e.target.value }))} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Location</label>
                                        <input value={appointmentForm.location} onChange={(e) => setAppointmentForm((c) => ({ ...c, location: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>Follow-up Date</label>
                                        <input type="date" value={appointmentForm.followUpDate} onChange={(e) => setAppointmentForm((c) => ({ ...c, followUpDate: e.target.value }))} />
                                    </div>
                                    <button type="submit" className="patient-action-primary" disabled={savingHealth}>{savingHealth ? "Saving..." : "Save appointment"}</button>
                                </form>
                                <div className="patient-insight-list">
                                    {appointments.slice(0, 8).map((ap) => (
                                        <div key={ap.id} className="patient-insight-row">
                                            <span>{ap.title} - {ap.status}</span>
                                            <strong>{formatDateTime(ap.appointmentAt)}</strong>
                                        </div>
                                    ))}
                                </div>
                            </article>

                            <article className="card patient-feature-card">
                                <div className="patient-card-topline">OCR Import</div>
                                <h3>Auto-fill lab/immunization/medication data from PDFs</h3>
                                <form onSubmit={submitOcrImport} className="patient-grid-columns">
                                    <div className="input-group">
                                        <label>Document</label>
                                        <input type="file" accept=".pdf,.txt,.csv" onChange={(e) => setOcrFile(e.target.files?.[0] || null)} />
                                    </div>
                                    <button type="submit" className="patient-action-primary" disabled={savingHealth}>{savingHealth ? "Processing..." : "Run OCR Import"}</button>
                                </form>
                                <div className="patient-insight-list">
                                    {ocrJobs.slice(0, 8).map((job) => (
                                        <div key={job.id} className="patient-insight-row">
                                            <span>{job.filename}</span>
                                            <strong>{job.status}</strong>
                                        </div>
                                    ))}
                                </div>
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
