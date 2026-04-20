"use client";

import { useRef } from "react";
import { Printer } from "lucide-react";

type Medication = {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
};

type PrintablePrescription = {
    id: string;
    createdAt: string;
    expiresAt?: string | null;
    notes?: string | null;
    status: string;
    doctor: { name: string; email?: string };
    patient?: { universalId?: string; dob?: string; user?: { name: string } };
    medications: Medication[];
};

export default function PrescriptionPrintView({
    prescription,
    patientName,
}: {
    prescription: PrintablePrescription;
    /** Fallback patient name if not nested in prescription.patient.user.name */
    patientName?: string;
}) {
    const printRef = useRef<HTMLDivElement>(null);

    const patient = prescription.patient;
    const resolvedPatientName =
        patient?.user?.name ?? patientName ?? "Unknown Patient";

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        // Inject a temporary print iframe so we don't disturb the main page.
        const iframe = document.createElement("iframe");
        iframe.style.cssText =
            "position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;";
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow!.document;
        doc.open();
        doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Prescription — ${resolvedPatientName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11pt;
      color: #0f172a;
      background: #fff;
      padding: 18mm 18mm 14mm;
      line-height: 1.55;
    }

    /* ── Header ── */
    .rx-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #0284c7;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .rx-brand { display: flex; flex-direction: column; }
    .rx-brand-name {
      font-size: 20pt;
      font-weight: 800;
      color: #0284c7;
      letter-spacing: -0.04em;
      line-height: 1;
    }
    .rx-brand-sub {
      font-size: 8pt;
      color: #64748b;
      font-weight: 500;
      margin-top: 2px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .rx-meta { text-align: right; font-size: 9pt; color: #475569; line-height: 1.7; }
    .rx-meta strong { color: #0f172a; }

    /* ── Rx Symbol ── */
    .rx-symbol {
      font-size: 28pt;
      font-weight: 800;
      color: #0284c7;
      line-height: 1;
      margin-bottom: 12px;
      font-style: italic;
    }

    /* ── Patient / Doctor block ── */
    .rx-parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 18px;
    }
    .rx-party {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 6px;
      padding: 10px 12px;
    }
    .rx-party-title {
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #0284c7;
      font-weight: 700;
      margin-bottom: 5px;
    }
    .rx-party-name { font-size: 12pt; font-weight: 700; color: #0f172a; }
    .rx-party-detail { font-size: 9pt; color: #475569; margin-top: 2px; }

    /* ── Medications table ── */
    .rx-section-title {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      font-weight: 700;
      margin-bottom: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    thead tr { background: #0284c7; color: #fff; }
    thead th {
      padding: 7px 10px;
      text-align: left;
      font-size: 8.5pt;
      font-weight: 600;
      letter-spacing: 0.04em;
    }
    tbody tr:nth-child(even) { background: #f0f9ff; }
    tbody td {
      padding: 7px 10px;
      font-size: 9.5pt;
      border-bottom: 1px solid #e0f2fe;
      vertical-align: top;
    }
    tbody td:first-child { font-weight: 600; }
    .med-num {
      display: inline-block;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #0284c7;
      color: #fff;
      font-size: 7pt;
      font-weight: 700;
      text-align: center;
      line-height: 18px;
      margin-right: 6px;
    }

    /* ── Notes ── */
    .rx-notes {
      background: #fffbeb;
      border-left: 3px solid #f59e0b;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 9.5pt;
      color: #92400e;
      margin-bottom: 16px;
    }
    .rx-notes strong { display: block; font-size: 8pt; color: #b45309; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.06em; }

    /* ── Expiry ── */
    .rx-expiry {
      font-size: 9pt;
      color: #dc2626;
      font-weight: 600;
      margin-bottom: 16px;
    }

    /* ── Footer ── */
    .rx-footer {
      margin-top: 28px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px dashed #bae6fd;
      padding-top: 12px;
      font-size: 8.5pt;
      color: #64748b;
    }
    .rx-signature-line {
      border-top: 1px solid #0f172a;
      width: 160px;
      text-align: center;
      padding-top: 4px;
      font-size: 8pt;
      color: #0f172a;
      font-weight: 500;
    }
    .rx-status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      background: #dcfce7;
      color: #15803d;
    }
    .rx-status-badge.pending { background: #fef3c7; color: #b45309; }
    .rx-status-badge.cancelled { background: #fee2e2; color: #b91c1c; }
    .rx-status-badge.expired { background: #f3f4f6; color: #6b7280; }
    .rx-status-badge.dispensed { background: #dcfce7; color: #15803d; }

    @page { margin: 0; size: A4; }
  </style>
</head>
<body>
  ${printContent.innerHTML}
</body>
</html>`);
        doc.close();

        iframe.onload = () => {
            iframe.contentWindow!.focus();
            iframe.contentWindow!.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
        };
    };

    const statusClass = prescription.status.toLowerCase();

    return (
        <>
            {/* Print button — visible on screen, hidden in print output */}
            <button
                type="button"
                onClick={handlePrint}
                className="btn btn-sm btn-outline-blue"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
            >
                <Printer className="w-4 h-4" />
                Print
            </button>

            {/* Hidden printable content — rendered off-screen, cloned into iframe */}
            <div ref={printRef} style={{ display: "none" }}>
                {/* ── Header ── */}
                <div className="rx-header">
                    <div className="rx-brand">
                        <span className="rx-brand-name">eMedicsHub</span>
                        <span className="rx-brand-sub">Electronic Prescription System</span>
                    </div>
                    <div className="rx-meta">
                        <div><strong>Date Issued:</strong> {new Date(prescription.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
                        {prescription.expiresAt && (
                            <div><strong>Valid Until:</strong> {new Date(prescription.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
                        )}
                        <div><strong>Ref:</strong> {prescription.id.slice(0, 12).toUpperCase()}</div>
                        <div style={{ marginTop: "4px" }}>
                            <span className={`rx-status-badge ${statusClass}`}>{prescription.status}</span>
                        </div>
                    </div>
                </div>

                {/* ── Rx Symbol ── */}
                <div className="rx-symbol">℞</div>

                {/* ── Patient + Doctor ── */}
                <div className="rx-parties">
                    <div className="rx-party">
                        <div className="rx-party-title">Patient</div>
                        <div className="rx-party-name">{resolvedPatientName}</div>
                        {patient?.dob && (
                            <div className="rx-party-detail">
                                DOB: {new Date(patient.dob).toLocaleDateString("en-GB")}
                            </div>
                        )}
                        {patient?.universalId && (
                            <div className="rx-party-detail">ID: {patient.universalId}</div>
                        )}
                    </div>
                    <div className="rx-party">
                        <div className="rx-party-title">Prescribing Doctor</div>
                        <div className="rx-party-name">{prescription.doctor.name}</div>
                        {prescription.doctor.email && (
                            <div className="rx-party-detail">{prescription.doctor.email}</div>
                        )}
                    </div>
                </div>

                {/* ── Medications ── */}
                <div className="rx-section-title">Prescribed Medications</div>
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: "30%" }}>Medication</th>
                            <th style={{ width: "15%" }}>Dosage</th>
                            <th style={{ width: "20%" }}>Frequency</th>
                            <th style={{ width: "15%" }}>Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                        {prescription.medications.map((med, i) => (
                            <tr key={med.id ?? i}>
                                <td>
                                    <span className="med-num">{i + 1}</span>
                                    {med.name}
                                </td>
                                <td>{med.dosage}</td>
                                <td>{med.frequency}</td>
                                <td>{med.duration === "N/A" ? "Ongoing" : med.duration}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* ── Notes ── */}
                {prescription.notes && (
                    <div className="rx-notes">
                        <strong>Clinical Notes</strong>
                        {prescription.notes}
                    </div>
                )}

                {/* ── Expiry warning ── */}
                {prescription.expiresAt && (
                    <div className="rx-expiry">
                        ⚠ This prescription expires on{" "}
                        {new Date(prescription.expiresAt).toLocaleDateString("en-GB", {
                            day: "numeric", month: "long", year: "numeric",
                        })}
                    </div>
                )}

                {/* ── Footer ── */}
                <div className="rx-footer">
                    <div>
                        <div>Issued via eMedicsHub Electronic Prescription System</div>
                        <div>This is an official electronic prescription. Verify at eMedicshub.com</div>
                    </div>
                    <div className="rx-signature-line">
                        {prescription.doctor.name}<br />
                        <span style={{ fontWeight: 400, fontSize: "7.5pt" }}>Authorised Prescriber</span>
                    </div>
                </div>
            </div>
        </>
    );
}
