"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
    const { data: session } = useSession();

    const userRole = (session?.user as any)?.role;

    const getPortalName = () => {
        if (!userRole) return "";
        switch (userRole) {
            case "PATIENT": return "Patient Portal";
            case "DOCTOR": return "Doctor Portal";
            case "PHARMACIST": return "Pharmacist Portal";
            case "ADMIN":
            case "SUPER_ADMIN": return "Admin Portal";
            default: return "";
        }
    };

    return (
        <nav className="nav">
            <div className="nav-content">
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
                    <Link href="/dashboard" className="nav-logo">E-Prescribe</Link>
                    {userRole && (
                        <span className="nav-subtitle">
                            | {getPortalName()}
                        </span>
                    )}
                </div>
                <div className="nav-links">
                    {((session?.user as any)?.role === "ADMIN" || (session?.user as any)?.role === "SUPER_ADMIN") && (
                        <Link href="/dashboard/admin" className="nav-link">Admin Panel</Link>
                    )}
                    <Link href="/dashboard/profile" className="nav-user link" style={{ cursor: "pointer", display: "inline-block" }}>
                        {session?.user?.name} ({(session?.user as any)?.role})
                    </Link>
                    {/* Remove the special admin logout link and use the standard one */}
                    <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn-logout">Logout</button>
                </div>
            </div>
        </nav>
    );
}
