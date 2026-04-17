import PortalLoginClient from "@/components/auth/PortalLoginClient";

export default function DoctorPortalLoginPage() {
    return (
        <PortalLoginClient
            portalKey="mydp"
            portalLabel="mydp"
            roleLabel="Doctor"
            expectedRole="DOCTOR"
            dashboardPath="/dashboard/doctor"
            accentColor="#1d4ed8"
            subtitle="Manage EmedsUsers, prescriptions, and linked health records securely."
            registerPath="/mydp/register"
        />
    );
}
