import Navbar from "@/components/ui/Navbar";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import PharmacistDashboardClient from "@/components/dashboard/pharmacist/PharmacistDashboardClient";

export default async function PharmacistDashboard() {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "PHARMACIST") {
        redirect("/myph/login");
    }

    return (
        <>
            <Navbar />
            <div className="container" style={{ marginTop: '2rem' }}>
                <PharmacistDashboardClient />
            </div>
        </>
    );
}
