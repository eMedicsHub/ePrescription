import Navbar from "@/components/Navbar";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DoctorDashboardClient from "@/components/DoctorDashboardClient";

export default async function DoctorDashboard() {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "DOCTOR") {
        redirect("/login");
    }

    return (
        <>
            <Navbar />
            <div className="container" style={{ marginTop: '2rem' }}>
                <DoctorDashboardClient />
            </div>
        </>
    );
}
