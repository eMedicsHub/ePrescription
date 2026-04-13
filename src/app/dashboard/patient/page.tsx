import Navbar from "@/components/Navbar";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import PatientDashboardClient from "@/components/PatientDashboardClient";

export default async function PatientDashboard() {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "PATIENT") {
        redirect("/mypa/login");
    }

    return (
        <>
            <Navbar />
            <div className="container" style={{ marginTop: '2rem' }}>
                <PatientDashboardClient />
            </div>
        </>
    );
}
