import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const role = (session.user as any).role;

    // allow regular admins or super admins
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        redirect("/dashboard");
    }

    return (
        <section>
            {children}
        </section>
    );
}
