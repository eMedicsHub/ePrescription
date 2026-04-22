"use client";

import { useState, useEffect } from "react";
import { Plus, X, ChevronDown, ChevronUp, FileText, Pencil, Check } from "lucide-react";

const FREQUENCY_OPTIONS = [
    "Once a day",
    "Twice a day",
    "8 Hourly",
    "12 Hourly",
    "6 Hourly",
    "As needed",
];

const DURATION_UNITS = ["Days", "Months", "Not Applicable"];

type TemplateMed = {
    name: string;
    dosage: string;
    frequency: string;
    durationValue: string;
    durationUnit: string;
};

type Template = {
    id: string;
    name: string;
    medications: { id: string; name: string; dosage: string; frequency: string; duration: string }[];
};

function emptyMed(): TemplateMed {
    return { name: "", dosage: "", frequency: FREQUENCY_OPTIONS[0], durationValue: "", durationUnit: DURATION_UNITS[0] };
}

function parseDuration(duration: string): { durationValue: string; durationUnit: string } {
    if (!duration || duration === "N/A") return { durationValue: "", durationUnit: "Not Applicable" };
    const parts = duration.split(" ");
    return {
        durationValue: parts[0] || "",
        durationUnit: DURATION_UNITS.includes(parts[1]) ? parts[1] : DURATION_UNITS[0],
    };
}

function formatDuration(value: string, unit: string): string {
    return unit === "Not Applicable" ? "N/A" : `${value} ${unit}`;
}

// ── Medication row used in both create and edit forms ──────────────────────────
function MedRow({
    med,
    index,
    onChange,
    onRemove,
    canRemove,
}: {
    med: TemplateMed;
    index: number;
    onChange: (i: number, field: keyof TemplateMed, val: string) => void;
    onRemove: (i: number) => void;
    canRemove: boolean;
}) {
    const inputCls =
        "px-2 py-1 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all w-full";

    return (
        <tr>
            <td className="px-1 py-1">
                <input
                    placeholder="Medicine"
                    value={med.name}
                    onChange={(e) => onChange(index, "name", e.target.value)}
                    required
                    className={inputCls}
                />
            </td>
            <td className="px-1 py-1">
                <input
                    placeholder="e.g. 500mg"
                    value={med.dosage}
                    onChange={(e) => onChange(index, "dosage", e.target.value)}
                    required
                    className={inputCls}
                />
            </td>
            <td className="px-1 py-1">
                <select
                    value={med.frequency}
                    onChange={(e) => onChange(index, "frequency", e.target.value)}
                    className={inputCls}
                >
                    {FREQUENCY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
            </td>
            <td className="px-1 py-1">
                <input
                    placeholder="7"
                    value={med.durationValue}
                    disabled={med.durationUnit === "Not Applicable"}
                    onChange={(e) => onChange(index, "durationValue", e.target.value)}
                    className={`${inputCls} w-14 text-center disabled:opacity-40`}
                />
            </td>
            <td className="px-1 py-1">
                <select
                    value={med.durationUnit}
                    onChange={(e) => onChange(index, "durationUnit", e.target.value)}
                    className={inputCls}
                >
                    {DURATION_UNITS.map((o) => <option key={o}>{o}</option>)}
                </select>
            </td>
            <td className="px-1 py-1 text-center">
                {canRemove && (
                    <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </td>
        </tr>
    );
}

// ── Inline template form (create or edit) ─────────────────────────────────────
function TemplateForm({
    initialName = "",
    initialMeds = [emptyMed()],
    submitLabel = "Save Template",
    onSubmit,
    onCancel,
    saving,
}: {
    initialName?: string;
    initialMeds?: TemplateMed[];
    submitLabel?: string;
    onSubmit: (name: string, meds: TemplateMed[]) => void;
    onCancel: () => void;
    saving: boolean;
}) {
    const [name, setName] = useState(initialName);
    const [meds, setMeds] = useState<TemplateMed[]>(initialMeds.length ? initialMeds : [emptyMed()]);

    const updateMed = (i: number, field: keyof TemplateMed, val: string) => {
        const next = [...meds];
        next[i] = { ...next[i], [field]: val };
        setMeds(next);
    };

    const removeMed = (i: number) => setMeds(meds.filter((_, idx) => idx !== i));
    const addMed = () => setMeds([...meds, emptyMed()]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(name, meds);
    };

    return (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            {/* Template name */}
            <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Condition / Template Name</label>
                <input
                    placeholder="e.g. Hypertension, UTI, Type 2 Diabetes"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                />
            </div>

            {/* Medications table */}
            <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Medications</label>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="text-xs w-full" style={{ tableLayout: "fixed", minWidth: "520px" }}>
                        <colgroup>
                            <col style={{ width: "28%" }} />
                            <col style={{ width: "16%" }} />
                            <col style={{ width: "22%" }} />
                            <col style={{ width: "10%" }} />
                            <col style={{ width: "18%" }} />
                            <col style={{ width: "6%" }} />
                        </colgroup>
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 uppercase tracking-wide text-left">
                                <th className="px-2 py-2 font-semibold">Name</th>
                                <th className="px-2 py-2 font-semibold">Dosage</th>
                                <th className="px-2 py-2 font-semibold">Frequency</th>
                                <th className="px-2 py-2 font-semibold" colSpan={2}>Duration</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {meds.map((med, i) => (
                                <MedRow
                                    key={i}
                                    med={med}
                                    index={i}
                                    onChange={updateMed}
                                    onRemove={removeMed}
                                    canRemove={meds.length > 1}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
                <button
                    type="button"
                    onClick={addMed}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Add medication
                </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
                <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-sm btn-blue"
                    style={{ fontSize: "0.8rem", padding: "0.4rem 1rem" }}
                >
                    {saving ? "Saving…" : submitLabel}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn btn-sm btn-outline-blue"
                    style={{ fontSize: "0.8rem", padding: "0.4rem 0.75rem" }}
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

// ── Main TemplateManager ───────────────────────────────────────────────────────
export default function TemplateManager({
    onUseTemplate,
    selectMode = false,
}: {
    onUseTemplate?: (data: { name: string; medications: { name: string; dosage: string; frequency: string; duration: string }[] }) => void;
    selectMode?: boolean;
}) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchTemplates = async () => {
        try {
            const res = await fetch("/api/templates");
            if (res.ok) setTemplates(await res.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTemplates(); }, []);

    // ── Create ──
    const handleCreate = async (name: string, meds: TemplateMed[]) => {
        setSaving(true);
        try {
            const res = await fetch("/api/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    medications: meds.map((m) => ({
                        name: m.name,
                        dosage: m.dosage,
                        frequency: m.frequency,
                        duration: formatDuration(m.durationValue, m.durationUnit),
                    })),
                }),
            });
            if (res.ok) {
                setShowCreate(false);
                fetchTemplates();
            }
        } finally {
            setSaving(false);
        }
    };

    // ── Edit ──
    const handleEdit = async (id: string, name: string, meds: TemplateMed[]) => {
        setSaving(true);
        try {
            const res = await fetch(`/api/templates/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    medications: meds.map((m) => ({
                        name: m.name,
                        dosage: m.dosage,
                        frequency: m.frequency,
                        duration: formatDuration(m.durationValue, m.durationUnit),
                    })),
                }),
            });
            if (res.ok) {
                setEditingId(null);
                setExpandedId(null);
                fetchTemplates();
            }
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ──
    const handleDelete = async (id: string) => {
        if (!confirm("Delete this template?")) return;
        setDeletingId(id);
        try {
            await fetch(`/api/templates/${id}`, { method: "DELETE" });
            setTemplates((prev) => prev.filter((t) => t.id !== id));
            if (editingId === id) setEditingId(null);
            if (expandedId === id) setExpandedId(null);
        } finally {
            setDeletingId(null);
        }
    };

    // ── Use template ──
    const handleUse = (t: Template) => {
        if (!onUseTemplate) return;
        onUseTemplate({
            name: t.name,
            medications: t.medications.map((m) => ({
                name: m.name,
                dosage: m.dosage,
                frequency: m.frequency,
                duration: m.duration,
            })),
        });
    };

    return (
        <div
            style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "1rem",
                marginBottom: "1rem",
            }}
        >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <FileText className="w-4 h-4" style={{ color: "var(--primary)" }} />
                    <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-main)" }}>My Templates</span>
                </div>
                {!showCreate && !selectMode && (
                    <button
                        type="button"
                        onClick={() => { setShowCreate(true); setEditingId(null); }}
                        className="btn btn-sm btn-blue"
                        style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New
                    </button>
                )}
            </div>

            {/* Create form */}
            {showCreate && (
                <div
                    style={{
                        background: "#f0f9ff",
                        border: "1px solid #bae6fd",
                        borderRadius: "0.625rem",
                        padding: "0.875rem",
                        marginBottom: "0.75rem",
                    }}
                >
                    <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)", marginBottom: "0.5rem" }}>
                        New Template
                    </p>
                    <TemplateForm
                        submitLabel="Save Template"
                        onSubmit={handleCreate}
                        onCancel={() => setShowCreate(false)}
                        saving={saving}
                    />
                </div>
            )}

            {/* Template list */}
            {loading ? (
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Loading templates…</p>
            ) : templates.length === 0 && !showCreate ? (
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", padding: "0.75rem 0" }}>
                    No templates yet. Create one to get started.
                </p>
            ) : (
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {templates.map((t) => {
                        const isExpanded = expandedId === t.id;
                        const isEditing = editingId === t.id;
                        const editMeds = t.medications.map((m) => ({ ...parseDuration(m.duration), name: m.name, dosage: m.dosage, frequency: m.frequency }));

                        return (
                            <li
                                key={t.id}
                                style={{
                                    background: "var(--bg-main)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "0.625rem",
                                    overflow: "hidden",
                                    transition: "box-shadow 0.2s",
                                }}
                            >
                                {/* Template header row */}
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "0.5rem 0.625rem",
                                        cursor: "pointer",
                                        userSelect: "none",
                                    }}
                                    onClick={() => {
                                        if (isEditing) return;
                                        setExpandedId(isExpanded ? null : t.id);
                                    }}
                                >
                                    {/* Name + medication count */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                                        <span
                                            style={{
                                                fontWeight: 600,
                                                fontSize: "0.8rem",
                                                color: "var(--text-main)",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {t.name}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: "0.7rem",
                                                background: "#dbeafe",
                                                color: "#1d4ed8",
                                                borderRadius: "9999px",
                                                padding: "0.1rem 0.45rem",
                                                fontWeight: 600,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {t.medications.length} med{t.medications.length !== 1 ? "s" : ""}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div
                                        style={{ display: "flex", gap: "0.3rem", alignItems: "center", flexShrink: 0 }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* Use */}
                                        {onUseTemplate && (
                                            <button
                                                type="button"
                                                onClick={() => handleUse(t)}
                                                className="btn btn-sm btn-blue"
                                                style={{ fontSize: "0.7rem", padding: "0.25rem 0.5rem", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}
                                                title="Load into prescription form"
                                            >
                                                <Check className="w-3 h-3" />
                                                Use
                                            </button>
                                        )}
                                        {/* Edit */}
                                        {!selectMode && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingId(isEditing ? null : t.id);
                                                    setExpandedId(t.id);
                                                }}
                                                className="btn btn-sm btn-outline-blue"
                                                style={{ fontSize: "0.7rem", padding: "0.25rem 0.4rem" }}
                                                title="Edit template"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                        )}
                                        {/* Delete */}
                                        {!selectMode && (
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(t.id)}
                                                disabled={deletingId === t.id}
                                                style={{
                                                    background: "transparent",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    color: "#94a3b8",
                                                    padding: "0.25rem",
                                                    borderRadius: "0.375rem",
                                                    lineHeight: 1,
                                                    transition: "color 0.15s",
                                                }}
                                                title="Delete template"
                                                onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                                                onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        {/* Expand chevron */}
                                        <span style={{ color: "var(--text-muted)" }}>
                                            {isExpanded
                                                ? <ChevronUp className="w-3.5 h-3.5" />
                                                : <ChevronDown className="w-3.5 h-3.5" />}
                                        </span>
                                    </div>
                                </div>

                                {/* Expanded content */}
                                {isExpanded && (
                                    <div style={{ borderTop: "1px solid var(--border)", padding: "0.625rem" }}>
                                        {isEditing ? (
                                            <TemplateForm
                                                initialName={t.name}
                                                initialMeds={editMeds}
                                                submitLabel="Update Template"
                                                onSubmit={(name, meds) => handleEdit(t.id, name, meds)}
                                                onCancel={() => { setEditingId(null); setExpandedId(null); }}
                                                saving={saving}
                                            />
                                        ) : (
                                            /* Read-only medication preview */
                                            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                                                {t.medications.map((m) => (
                                                    <li
                                                        key={m.id}
                                                        style={{
                                                            fontSize: "0.78rem",
                                                            padding: "0.35rem 0.5rem",
                                                            background: "var(--card-bg)",
                                                            borderRadius: "0.375rem",
                                                            border: "1px solid var(--border)",
                                                        }}
                                                    >
                                                        <span style={{ fontWeight: 600, color: "var(--primary)" }}>{m.name}</span>
                                                        <span style={{ color: "var(--text-muted)", marginLeft: "0.4rem" }}>
                                                            {m.dosage} · {m.frequency} · {m.duration === "N/A" ? "Ongoing" : m.duration}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
