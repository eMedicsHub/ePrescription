import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const role = (session.user as any).role;

    if (role === "ADMIN" || role === "SUPER_ADMIN") {
        redirect("/dashboard/admin");
    } else if (role === "DOCTOR") {
        redirect("/dashboard/doctor");
    } else if (role === "PHARMACIST") {
        redirect("/dashboard/pharmacist");
    } else {
        redirect("/dashboard/patient");
    }
}
