import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import HealthProfileClient from "@/components/settings/HealthProfileClient";

export default async function HealthProfilePage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/login");
    }

    if ((session.user as any).role !== "PATIENT") {
        redirect("/dashboard/profile");
    }

    return (
        <>
            <Navbar />
            <div className="container" style={{ marginTop: "2rem" }}>
                <HealthProfileClient />
            </div>
        </>
    );
}
