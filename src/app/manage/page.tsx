"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, AlertCircle, Loader, Clock, User, Mail, Calendar } from "lucide-react";

type PendingRegistration = {
    id: string;
    name: string;
    email: string;
    role: "DOCTOR" | "PHARMACIST";
    createdAt: string;
};

export default function AdminManagePage() {
    const [registrations, setRegistrations] = useState<PendingRegistration[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [denyReason, setDenyReason] = useState<string>("");
    const [showDenyModal, setShowDenyModal] = useState(false);
    const [selectedForDeny, setSelectedForDeny] = useState<string | null>(null);
    const router = useRouter();
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/manage/login");
        }
    }, [status, router]);

    useEffect(() => {
        if (session) {
            const role = (session.user as any)?.role;
            if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
                router.push("/mypa/login");
            }
        }
    }, [session, router]);

    async function loadRegistrations() {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/admin/registrations", { cache: "no-store" });
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Failed to load registrations");
                setRegistrations([]);
                return;
            }

            // Filter only DOCTOR and PHARMACIST pending registrations
            const pending = (data.registrations || []).filter(
                (r: any) => !r.isApproved && (r.role === "DOCTOR" || r.role === "PHARMACIST")
            );
            setRegistrations(pending);
        } catch {
            setError("Failed to load registrations");
            setRegistrations([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (session?.user) {
            loadRegistrations();
        }
    }, [session]);

    async function handleApprove(id: string) {
        setActioningId(id);
        try {
            const response = await fetch(`/api/admin/registrations/${id}/approve`, {
                method: "POST",
            });

            if (!response.ok) {
                const data = await response.json();
                setError(data.error || "Failed to approve registration");
                return;
            }

            setRegistrations((current) => current.filter((r) => r.id !== id));
        } catch {
            setError("Failed to approve registration");
        } finally {
            setActioningId(null);
        }
    }

    async function handleDenySubmit() {
        if (!selectedForDeny) return;

        setActioningId(selectedForDeny);
        try {
            const response = await fetch(`/api/admin/registrations/${selectedForDeny}/deny`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: denyReason || "Application denied" }),
            });

            if (!response.ok) {
                const data = await response.json();
                setError(data.error || "Failed to deny registration");
                return;
            }

            setRegistrations((current) => current.filter((r) => r.id !== selectedForDeny));
            setShowDenyModal(false);
            setDenyReason("");
            setSelectedForDeny(null);
        } catch {
            setError("Failed to deny registration");
        } finally {
            setActioningId(null);
        }
    }

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600">Loading admin panel...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-slate-200">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Admin Portal</h1>
                        <p className="text-sm text-slate-500">Review registration requests</p>
                    </div>
                    <Link
                        href="/mypa/login"
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Back to Portals
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                {/* Error Alert */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-red-900">{error}</p>
                            <button
                                onClick={() => setError(null)}
                                className="text-sm text-red-700 hover:underline mt-1"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : registrations.length === 0 ? (
                    <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Pending Registrations</h3>
                        <p className="text-slate-600">All registration requests have been processed.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <h2 className="text-lg font-semibold text-slate-900 mb-4">
                                Pending Requests ({registrations.length})
                            </h2>
                            <div className="space-y-3">
                                {registrations.map((registration) => (
                                    <div
                                        key={registration.id}
                                        className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-blue-100 rounded-lg">
                                                    <User className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-slate-900">{registration.name}</h4>
                                                    <p className="text-sm text-slate-600">{registration.role}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-slate-600 ml-11">
                                                <div className="flex items-center gap-1">
                                                    <Mail className="w-4 h-4" />
                                                    {registration.email}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {new Date(registration.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 ml-4">
                                            <button
                                                onClick={() => handleApprove(registration.id)}
                                                disabled={actioningId === registration.id}
                                                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 font-semibold rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-green-200"
                                            >
                                                {actioningId === registration.id ? (
                                                    <Loader className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle2 className="w-4 h-4" />
                                                )}
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedForDeny(registration.id);
                                                    setShowDenyModal(true);
                                                }}
                                                disabled={actioningId === registration.id}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 font-semibold rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-red-200"
                                            >
                                                {actioningId === registration.id ? (
                                                    <Loader className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <XCircle className="w-4 h-4" />
                                                )}
                                                Deny
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Deny Modal */}
            {showDenyModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Deny Registration</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Reason for Denial (optional)
                            </label>
                            <textarea
                                value={denyReason}
                                onChange={(e) => setDenyReason(e.target.value)}
                                placeholder="Enter reason for denial..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white placeholder-slate-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none"
                                rows={4}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDenyModal(false);
                                    setDenyReason("");
                                    setSelectedForDeny(null);
                                }}
                                className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDenySubmit}
                                disabled={actioningId !== null}
                                className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                                {actioningId ? <Loader className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                Deny
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
