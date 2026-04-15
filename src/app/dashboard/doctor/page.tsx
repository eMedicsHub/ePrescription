import Navbar from "@/components/ui/Navbar";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DoctorDashboardClient from "@/components/dashboard/doctor/DoctorDashboardClient";

export default async function DoctorDashboard() {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "DOCTOR") {
        redirect("/mydp/login");
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
