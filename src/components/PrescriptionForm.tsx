"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Sparkles, Keyboard, Loader2, CheckCircle2, AlertCircle, Plus, X } from "lucide-react";
import { getEngine, isEngineReady, preloadEngine } from "@/lib/webllm-engine";

const FREQUENCY_OPTIONS = [
    "Once a day",
    "Twice a day",
    "8 Hourly",
    "12 Hourly",
    "6 Hourly",
    "As needed"
];

const DURATION_UNITS = [
    "Days",
    "Months",
    "Not Applicable"
];

type Medication = {
    name: string;
    dosage: string;
    frequency: string;
    durationValue: string;
    durationUnit: string;
    details: string;
};

type LlmStatus =
    | { state: "idle" }
    | { state: "loading"; progress: number; text: string }
    | { state: "ready" }
    | { state: "parsing" }
    | { state: "done" }
    | { state: "error"; message: string };

// Declare SpeechRecognition types
declare global {
    interface Window {
        SpeechRecognition: typeof SpeechRecognition;
        webkitSpeechRecognition: typeof SpeechRecognition;
    }
}

export default function PrescriptionForm({ patient, onComplete, initialData }: {
    patient: { id: string; dob: string; user: { name: string } };
    onComplete: () => void;
    initialData?: {
        medications?: { name: string; dosage: string; frequency: string; duration: string }[];
        notes?: string;
    };
}) {
    const [inputMode, setInputMode] = useState<"manual" | "voice">("manual");

    // --- Medication state (shared between modes) ---
    const [medications, setMedications] = useState<Medication[]>(
        initialData?.medications?.map((m) => ({
            name: m.name || "",
            dosage: m.dosage || "",
            frequency: m.frequency || FREQUENCY_OPTIONS[0],
            durationValue: m.duration && m.duration !== "N/A" ? m.duration.split(" ")[0] : "",
            durationUnit: m.duration && m.duration !== "N/A" ? m.duration.split(" ")[1] : DURATION_UNITS[0],
            details: "",
        })) || [{ name: "", dosage: "", frequency: FREQUENCY_OPTIONS[0], durationValue: "", durationUnit: DURATION_UNITS[0], details: "" }]
    );
    const [notes, setNotes] = useState(initialData?.notes || "");
    const [expiresInDays, setExpiresInDays] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // --- Medicine autocomplete ---
    const [suggestions, setSuggestions] = useState<{ id: string; name: string }[]>([]);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // --- Voice state ---
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [parsed, setParsed] = useState(false); // true once AI has parsed successfully
    const [llmStatus, setLlmStatus] = useState<LlmStatus>({ state: "idle" });
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // Close autocomplete on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
                setActiveSuggestionIndex(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Eagerly preload the engine when Voice tab is opened for the first time
    useEffect(() => {
        if (inputMode === "voice" && !isEngineReady()) {
            preloadEngine();
        }
    }, [inputMode]);

    // Clean up speech recognition on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    // ---------- Autocomplete ----------
    const handleNameChange = async (index: number, value: string) => {
        updateMedication(index, "name", value);
        if (value.length >= 2) {
            setActiveSuggestionIndex(index);
            try {
                const res = await fetch(`/api/medicines?q=${encodeURIComponent(value)}`);
                if (res.ok) setSuggestions(await res.json());
            } catch {
                // non-critical
            }
        } else {
            setSuggestions([]);
            setActiveSuggestionIndex(null);
        }
    };

    const selectSuggestion = (index: number, medicineName: string) => {
        updateMedication(index, "name", medicineName);
        setSuggestions([]);
        setActiveSuggestionIndex(null);
    };

    // ---------- Medication CRUD ----------
    const addMedication = () => {
        setMedications([...medications, { name: "", dosage: "", frequency: FREQUENCY_OPTIONS[0], durationValue: "", durationUnit: DURATION_UNITS[0], details: "" }]);
    };

    const removeMedication = (index: number) => {
        setMedications(medications.filter((_, i) => i !== index));
    };

    const updateMedication = (index: number, field: string, value: string) => {
        const newMeds = [...medications];
        (newMeds[index] as Record<string, string>)[field] = value;
        setMedications(newMeds);
    };

    // ---------- Voice: Speech Recognition ----------
    const startListening = useCallback(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            alert("Speech recognition is not supported in your browser. Please use Google Chrome.");
            return;
        }
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        let finalText = "";

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interimText = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalText += result[0].transcript + " ";
                } else {
                    interimText += result[0].transcript;
                }
            }
            setTranscript(finalText + interimText);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error("Speech recognition error:", event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsListening(true);
    }, []);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsListening(false);
    }, []);

    // ---------- Voice: WebLLM parse ----------
    const handleParseWithAI = async () => {
        if (!transcript.trim()) return;

        // If already loaded, skip straight to parsing
        if (!isEngineReady()) {
            setLlmStatus({ state: "loading", progress: 0, text: "Initialising AI model…" });
        } else {
            setLlmStatus({ state: "parsing" });
        }

        try {
            // getEngine() returns the singleton — no re-download if already cached
            const engine = await getEngine((progress, text) => {
                setLlmStatus({ state: "loading", progress, text });
            });

            setLlmStatus({ state: "parsing" });

            const systemPrompt = `You are a medical prescription parser. Extract medications from the doctor's dictation.
Return ONLY a valid JSON array — no explanation, no markdown, no extra text.
Each item must have:
  "name": medication name (string)
  "dosage": dose with units, e.g. "500mg" (string)
  "frequency": one of exactly ["Once a day","Twice a day","8 Hourly","12 Hourly","6 Hourly","As needed"]
  "duration": a string like "7 Days" or "1 Months", or "N/A" if not mentioned
  "details": any additional instructions from the doctor (string)
If the doctor mentions multiple medications, include one object per medication.`;

            const response = await engine.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Parse this prescription: "${transcript.trim()}"` },
                ],
                temperature: 0.1,
                max_tokens: 512,
            });

            const raw = response.choices[0].message.content?.trim() ?? "[]";

            // Extract JSON array from the response (handle model adding extra text)
            const jsonMatch = raw.match(/\[[\s\S]*\]/);
            if (!jsonMatch) throw new Error("Could not find JSON array in model response.");

            const parsed: { name: string; dosage: string; frequency: string; duration: string }[] = JSON.parse(jsonMatch[0]);

            if (!Array.isArray(parsed) || parsed.length === 0) {
                throw new Error("Model returned an empty medication list. Please try again with more detail.");
            }

            // Map parsed into medication state
            const mapped: Medication[] = parsed.map((m) => {
                const dur = m.duration?.trim();
                const isNA = !dur || dur === "N/A";
                const parts = dur ? dur.split(" ") : [];
                return {
                    name: m.name || "",
                    dosage: m.dosage || "",
                    frequency: FREQUENCY_OPTIONS.includes(m.frequency) ? m.frequency : FREQUENCY_OPTIONS[0],
                    durationValue: isNA ? "" : (parts[0] || ""),
                    durationUnit: isNA ? "Not Applicable" : (DURATION_UNITS.includes(parts[1]) ? parts[1] : DURATION_UNITS[0]),
                    details: "",
                };
            });

            setMedications(mapped);
            setLlmStatus({ state: "done" });
            setParsed(true); // lock voice controls, show editable table
            // Stay in voice mode — the table renders below the voice section
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            setLlmStatus({ state: "error", message: msg });
        }
    };

    // ---------- Form submit ----------
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const formattedMedications = medications.map((m) => ({
                name: m.name,
                dosage: m.dosage,
                frequency: m.frequency,
                duration: m.durationUnit === "Not Applicable" ? "N/A" : `${m.durationValue} ${m.durationUnit}`,
                details: m.details || "",
            }));

            let expiresAt = null;
            if (expiresInDays && !isNaN(parseInt(expiresInDays))) {
                const date = new Date();
                date.setDate(date.getDate() + parseInt(expiresInDays));
                expiresAt = date.toISOString();
            }

            const res = await fetch("/api/prescriptions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ patientId: patient.id, medications: formattedMedications, notes, expiresAt }),
            });

            if (res.ok) {
                onComplete();
            } else {
                const data = await res.json();
                setError(data.error || "Failed to create prescription");
            }
        } catch {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    // ---------- Render helpers ----------
    const renderLlmStatus = () => {
        if (llmStatus.state === "idle") return null;
        if (llmStatus.state === "loading") {
            return (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm font-medium mb-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading AI model ({llmStatus.progress}%)
                    </div>
                    <div className="w-full bg-blue-100 dark:bg-blue-800 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(2, llmStatus.progress)}%` }}
                        />
                    </div>
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 truncate">{llmStatus.text}</p>
                </div>
            );
        }
        if (llmStatus.state === "parsing") {
            return (
                <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 flex items-center gap-2 text-indigo-700 text-sm font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Parsing prescription…
                </div>
            );
        }
        if (llmStatus.state === "done") {
            return (
                <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 flex items-center gap-2 text-emerald-700 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Medications extracted! Review the table below and make any corrections.
                </div>
            );
        }
        if (llmStatus.state === "error") {
            return (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 flex items-start gap-2 text-red-700 text-sm font-medium">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{llmStatus.message}</span>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 dark:border-slate-700 p-8" style={{ maxWidth: "860px" }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 m-0">
                    New Prescription for <span className="text-blue-600">{patient.user.name}</span>
                </h3>
            </div>

            {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-xl mb-5 text-sm font-medium border border-red-100">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Mode toggle */}
            <div className="flex gap-2 mb-6">
                <button
                    type="button"
                    onClick={() => { setInputMode("manual"); setParsed(false); }}
                    className={`btn btn-sm ${inputMode === "manual" ? "btn-tab-active" : "btn-tab-inactive"}`}
                >
                    <Keyboard className="w-4 h-4" />
                    Manual
                </button>
                <button
                    type="button"
                    onClick={() => setInputMode("voice")}
                    disabled={parsed}
                    className={`btn btn-sm ${inputMode === "voice" ? "btn-tab-active" : "btn-tab-inactive"}`}
                    style={parsed ? { opacity: 0.45, cursor: "not-allowed" } : {}}
                >
                    <Mic className="w-4 h-4" />
                    Voice
                </button>
            </div>

            {/* ---- VOICE MODE ---- */}
            {inputMode === "voice" && (
                <div className="mb-8">
                    {!parsed ? (
                        /* ---- Dictation controls (hidden once parsed) ---- */
                        <>
                            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                                Dictate the prescription, edit if needed, then click <strong>Generate Prescription</strong>.
                            </p>

                            {/* Record button */}
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                                {!isListening ? (
                                    <button type="button" onClick={startListening} className="btn btn-blue btn-sm">
                                        <Mic className="w-4 h-4" />
                                        Start Dictation
                                    </button>
                                ) : (
                                    <button type="button" onClick={stopListening} className="btn btn-outline-blue btn-sm">
                                        <MicOff className="w-4 h-4" />
                                        Stop Recording
                                    </button>
                                )}
                                {isListening && (
                                    <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--primary)", fontSize: "0.875rem", fontWeight: 600 }}>
                                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", display: "inline-block", animation: "ping 1s cubic-bezier(0,0,0.2,1) infinite" }} />
                                        Recording…
                                    </span>
                                )}
                            </div>

                            {/* Editable transcript */}
                            <div style={{ position: "relative" }}>
                                <textarea
                                    value={transcript}
                                    onChange={(e) => setTranscript(e.target.value)}
                                    placeholder="Your dictation will appear here. You can also type or edit before parsing…"
                                    rows={6}
                                    style={{
                                        width: "100%",
                                        padding: "0.75rem 1rem",
                                        borderRadius: "0.75rem",
                                        border: "1px solid var(--border)",
                                        background: "var(--card-bg)",
                                        color: "var(--text-main)",
                                        fontSize: "0.875rem",
                                        resize: "vertical",
                                        outline: "none",
                                    }}
                                />
                                {transcript && (
                                    <button
                                        type="button"
                                        onClick={() => setTranscript("")}
                                        style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                                        title="Clear"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Parse button */}
                            <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                <button
                                    type="button"
                                    onClick={handleParseWithAI}
                                    disabled={!transcript.trim() || llmStatus.state === "loading" || llmStatus.state === "parsing"}
                                    className="btn btn-blue btn-sm"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Generate Prescription
                                </button>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                    Runs locally — no data leaves your machine
                                </span>
                            </div>

                            {renderLlmStatus()}
                        </>
                    ) : (
                        /* ---- Post-parse: voice controls hidden, compact note shown ---- */
                        <p style={{ fontSize: "0.875rem", color: "var(--primary)", fontWeight: 600, marginBottom: "0.5rem" }}>
                            ✓ Medications extracted — review and edit below
                        </p>
                    )}
                </div>
            )}

            {/* ---- MEDICATION TABLE: shown for Manual tab, or Voice tab after parsing ---- */}
            <form onSubmit={handleSubmit}>
                {(inputMode === "manual" || (inputMode === "voice" && parsed)) && (
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Medications</label>
                        {/* Scrollable wrapper so the single-row table never wraps */}
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                            <table className="text-sm" style={{ tableLayout: "fixed", width: "max-content", minWidth: "100%" }}>
                                <colgroup>
                                    <col style={{ width: "180px" }} />
                                    <col style={{ width: "100px" }} />
                                    <col style={{ width: "140px" }} />
                                    <col style={{ width: "80px" }} />
                                    <col style={{ width: "120px" }} />
                                    <col style={{ width: "200px" }} />
                                    <col style={{ width: "40px" }} />
                                </colgroup>
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800 text-left text-slate-500 text-xs uppercase tracking-wide">
                                        <th className="px-3 py-2.5 font-semibold">Name</th>
                                        <th className="px-3 py-2.5 font-semibold">Dosage</th>
                                        <th className="px-3 py-2.5 font-semibold">Frequency</th>
                                        <th className="px-3 py-2.5 font-semibold" colSpan={2}>Duration</th>
                                        <th className="px-3 py-2.5 font-semibold">Details</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {medications.map((med, index) => (
                                        <tr key={index} className="bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">

                                            {/* Name + autocomplete */}
                                            <td className="px-2 py-1.5 relative">
                                                <input
                                                    placeholder="Medicine name"
                                                    value={med.name}
                                                    onChange={(e) => handleNameChange(index, e.target.value)}
                                                    onFocus={() => med.name.length >= 2 && setActiveSuggestionIndex(index)}
                                                    required
                                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm"
                                                />
                                                {activeSuggestionIndex === index && suggestions.length > 0 && (
                                                    <div
                                                        ref={suggestionsRef}
                                                        className="absolute top-full left-2 right-2 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto"
                                                    >
                                                        {suggestions.map((s) => (
                                                            <div
                                                                key={s.id}
                                                                onClick={() => selectSuggestion(index, s.name)}
                                                                className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                                                            >
                                                                {s.name}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Dosage */}
                                            <td className="px-2 py-1.5">
                                                <input
                                                    placeholder="e.g. 500mg"
                                                    value={med.dosage}
                                                    onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                                                    required
                                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm"
                                                />
                                            </td>

                                            {/* Frequency */}
                                            <td className="px-2 py-1.5">
                                                <select
                                                    value={med.frequency}
                                                    onChange={(e) => updateMedication(index, "frequency", e.target.value)}
                                                    required
                                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm"
                                                >
                                                    {FREQUENCY_OPTIONS.map((opt) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </td>

                                            {/* Duration value */}
                                            <td className="pl-2 pr-1 py-1.5">
                                                <input
                                                    placeholder="7"
                                                    type="text"
                                                    value={med.durationValue}
                                                    onChange={(e) => updateMedication(index, "durationValue", e.target.value)}
                                                    disabled={med.durationUnit === "Not Applicable"}
                                                    required={med.durationUnit !== "Not Applicable"}
                                                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm disabled:opacity-50 text-center"
                                                />
                                            </td>

                                            {/* Duration unit */}
                                            <td className="pl-1 pr-2 py-1.5">
                                                <select
                                                    value={med.durationUnit}
                                                    onChange={(e) => updateMedication(index, "durationUnit", e.target.value)}
                                                    required
                                                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm"
                                                >
                                                    {DURATION_UNITS.map((opt) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </td>

                                            {/* Details */}
                                            <td className="px-2 py-1.5">
                                                <input
                                                    placeholder="Additional details…"
                                                    value={med.details}
                                                    onChange={(e) => updateMedication(index, "details", e.target.value)}
                                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm"
                                                />
                                            </td>

                                            {/* Remove */}
                                            <td className="px-1 py-1.5 text-center">
                                                {medications.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeMedication(index)}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <button
                            type="button"
                            onClick={addMedication}
                            className="btn btn-outline-blue btn-sm"
                            style={{ marginTop: "0.75rem" }}
                        >
                            <Plus className="w-4 h-4" />
                            Add Medication
                        </button>
                    </div>
                )}

                {/* No compact summary — the full table above serves that purpose */}

                {/* Notes & Expiry — always visible */}
                <div className="mt-6 space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Overall Prescription Validity (Optional)</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                min="1"
                                placeholder="e.g. 30"
                                value={expiresInDays}
                                onChange={(e) => setExpiresInDays(e.target.value)}
                                className="w-28 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm"
                            />
                            <span className="text-slate-500 text-sm">days until expiration</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm resize-none"
                            placeholder="Any additional clinical notes…"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary btn-sm"
                    style={{ width: "100%", marginTop: "1.5rem", padding: "0.75rem", fontSize: "1rem" }}
                >
                    {loading ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Issuing…</>
                    ) : (
                        "Issue Prescription"
                    )}
                </button>
            </form>
        </div>
    );
}
