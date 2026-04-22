'use client'

import { useEffect, useState } from 'react'
import { addMedicine } from '@/lib/actions/medicineActions'
import { createAdminUser } from '@/lib/actions/adminActions'
import { useSession } from 'next-auth/react'
import Navbar from '@/components/Navbar'
import { Pill, PlusCircle, UserPlus, Mail, Lock, User, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react'

type PendingRegistration = {
    id: string
    name: string
    email: string
    role: 'DOCTOR' | 'PHARMACIST' | 'PATIENT'
    createdAt: string
}

export default function AdminDashboard() {
    const [name, setName] = useState('')
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // state for creating new admin (only available to super admins)
    const [adminEmail, setAdminEmail] = useState('')
    const [adminName, setAdminName] = useState('')
    const [adminPassword, setAdminPassword] = useState('')
    const [adminMessage, setAdminMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [adminSubmitting, setAdminSubmitting] = useState(false)
    const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([])
    const [pendingLoading, setPendingLoading] = useState(true)
    const [pendingError, setPendingError] = useState<string | null>(null)
    const [approvingId, setApprovingId] = useState<string | null>(null)

    const { data: session } = useSession()
    const role = (session?.user as any)?.role

    async function loadPendingRegistrations() {
        setPendingLoading(true)
        setPendingError(null)

        try {
            const response = await fetch('/api/admin/registrations', { cache: 'no-store' })
            const data = await response.json()

            if (!response.ok) {
                setPendingError(data.error || 'Failed to load pending registrations')
                setPendingRegistrations([])
                return
            }

            setPendingRegistrations(data.registrations || [])
        } catch {
            setPendingError('Failed to load pending registrations')
            setPendingRegistrations([])
        } finally {
            setPendingLoading(false)
        }
    }

    useEffect(() => {
        if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
            loadPendingRegistrations()
        }
    }, [role])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage(null)

        const formData = new FormData()
        formData.append('name', name)

        const result = await addMedicine(formData)

        if (result.error) {
            setMessage({ type: 'error', text: result.error })
        } else if (result.success) {
            setMessage({ type: 'success', text: result.success })
            setName('')
        }
        setIsSubmitting(false)
    }

    async function handleAdminSubmit(e: React.FormEvent) {
        e.preventDefault()
        setAdminSubmitting(true)
        setAdminMessage(null)

        const formData = new FormData()
        formData.append('email', adminEmail)
        formData.append('name', adminName)
        formData.append('password', adminPassword)

        const result = await createAdminUser(formData)
        if (result.error) {
            setAdminMessage({ type: 'error', text: result.error })
        } else if (result.success) {
            setAdminMessage({ type: 'success', text: result.success })
            setAdminEmail('')
            setAdminName('')
            setAdminPassword('')
        }

        setAdminSubmitting(false)
    }

    async function handleApproveRegistration(userId: string) {
        setApprovingId(userId)
        setPendingError(null)

        try {
            const response = await fetch(`/api/admin/registrations/${userId}/approve`, {
                method: 'POST',
            })

            const data = await response.json()
            if (!response.ok) {
                setPendingError(data.error || 'Failed to approve registration')
                return
            }

            setPendingRegistrations((current) => current.filter((registration) => registration.id !== userId))
        } catch {
            setPendingError('Failed to approve registration')
        } finally {
            setApprovingId(null)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50/50">
            <Navbar />

            <main className="container mx-auto px-4 py-8 max-w-5xl">
                <div className="flex items-center gap-3 mb-10">
                    <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Portal</h1>
                        <p className="text-slate-500 font-medium mt-1">Manage system resources and administrators</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

                    {/* Add Medicine Card */}
                    <div className="bg-white shadow-xl shadow-slate-200/50 rounded-2xl p-8 border border-slate-100 transition-all hover:shadow-2xl hover:-translate-y-1 duration-300 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full translate-x-16 -translate-y-16 group-hover:scale-110 transition-transform duration-500 ease-out" />

                        <div className="relative">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <Pill className="w-6 h-6" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-800">Add Medicine Library</h2>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label htmlFor="name" className="text-sm font-semibold text-slate-700">
                                        Medicine Name
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <Pill className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            id="name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                                            placeholder="e.g. Amoxicillin 500mg"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 ${isSubmitting
                                        ? 'bg-slate-400 cursor-not-allowed shadow-none'
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-blue-500/25 active:scale-[0.98]'
                                        }`}
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <PlusCircle className="w-5 h-5" />
                                            <span>Add Medicine</span>
                                        </>
                                    )}
                                </button>
                            </form>

                            {message && (
                                <div className={`mt-6 p-4 flex items-start gap-3 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 ${message.type === 'success'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/50'
                                    : 'bg-rose-50 text-rose-800 border border-rose-200/50'
                                    }`}>
                                    {message.type === 'success' ? (
                                        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                                    )}
                                    <p>{message.text}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Create Admin Card (Super Admin Only) */}
                    {role === 'SUPER_ADMIN' ? (
                        <div className="bg-white shadow-xl shadow-slate-200/50 rounded-2xl p-8 border border-slate-100 transition-all hover:shadow-2xl hover:-translate-y-1 duration-300 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full translate-x-16 -translate-y-16 group-hover:scale-110 transition-transform duration-500 ease-out" />

                            <div className="relative">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-800">Create Administrator</h2>
                                </div>

                                <form onSubmit={handleAdminSubmit} className="space-y-5">
                                    <div className="space-y-2">
                                        <label htmlFor="adminName" className="text-sm font-semibold text-slate-700">
                                            Full Name
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <input
                                                type="text"
                                                id="adminName"
                                                value={adminName}
                                                onChange={(e) => setAdminName(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200"
                                                placeholder="e.g. Jane Doe"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="adminEmail" className="text-sm font-semibold text-slate-700">
                                            Email / Username
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            <input
                                                type="text"
                                                id="adminEmail"
                                                value={adminEmail}
                                                onChange={(e) => setAdminEmail(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200"
                                                placeholder="admin@hospital.com"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="adminPassword" className="text-sm font-semibold text-slate-700">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                <Lock className="w-5 h-5" />
                                            </div>
                                            <input
                                                type="password"
                                                id="adminPassword"
                                                value={adminPassword}
                                                onChange={(e) => setAdminPassword(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200"
                                                required
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={adminSubmitting}
                                        className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-white mt-2 shadow-lg transition-all duration-200 ${adminSubmitting
                                            ? 'bg-slate-400 cursor-not-allowed shadow-none'
                                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-indigo-500/25 active:scale-[0.98]'
                                            }`}
                                    >
                                        {adminSubmitting ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <UserPlus className="w-5 h-5" />
                                                <span>Create Admin Account</span>
                                            </>
                                        )}
                                    </button>
                                </form>

                                {adminMessage && (
                                    <div className={`mt-6 p-4 flex items-start gap-3 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 ${adminMessage.type === 'success'
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/50'
                                        : 'bg-rose-50 text-rose-800 border border-rose-200/50'
                                        }`}>
                                        {adminMessage.type === 'success' ? (
                                            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                                        ) : (
                                            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                                        )}
                                        <p>{adminMessage.text}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-100/50 rounded-2xl p-8 border border-slate-200 border-dashed flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                            <div className="p-4 bg-slate-200/50 rounded-full mb-4 text-slate-400">
                                <ShieldCheck className="w-10 h-10" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">Restricted Area</h3>
                            <p className="text-slate-500 text-sm max-w-xs">
                                Only Super Administrators have the permission to create new admin accounts.
                            </p>
                        </div>
                    )}
                </div>

                <section className="mt-8 bg-white shadow-xl shadow-slate-200/50 rounded-2xl p-8 border border-slate-100">
                    <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Pending Registrations</h2>
                            <p className="text-sm text-slate-500 mt-1">Approve newly registered doctors, pharmacists, and patients before they can log in.</p>
                        </div>
                        <button
                            type="button"
                            onClick={loadPendingRegistrations}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                            disabled={pendingLoading}
                        >
                            Refresh
                        </button>
                    </div>

                    {pendingError && (
                        <div className="mb-4 p-4 flex items-start gap-3 rounded-xl text-sm font-medium bg-rose-50 text-rose-800 border border-rose-200/50">
                            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                            <p>{pendingError}</p>
                        </div>
                    )}

                    {pendingLoading ? (
                        <div className="py-10 text-center text-slate-500">Loading pending registrations…</div>
                    ) : pendingRegistrations.length === 0 ? (
                        <div className="py-10 text-center text-slate-500">No registrations are waiting for approval.</div>
                    ) : (
                        <div className="space-y-4">
                            {pendingRegistrations.map((registration) => (
                                <div key={registration.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-2xl border border-slate-200 bg-slate-50/60">
                                    <div>
                                        <h3 className="text-base font-semibold text-slate-900">{registration.name}</h3>
                                        <p className="text-sm text-slate-600">{registration.email}</p>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {registration.role} • Registered {new Date(registration.createdAt).toLocaleString()}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleApproveRegistration(registration.id)}
                                        disabled={approvingId === registration.id}
                                        className={`px-5 py-3 rounded-xl font-semibold text-white transition-all ${approvingId === registration.id
                                            ? 'bg-slate-400 cursor-not-allowed'
                                            : 'bg-emerald-600 hover:bg-emerald-700'
                                            }`}
                                    >
                                        {approvingId === registration.id ? 'Approving…' : 'Approve Account'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    )
}
