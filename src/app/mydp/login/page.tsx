import PortalLoginClient from "@/components/PortalLoginClient";

export default function DoctorPortalLoginPage() {
    return (
        <PortalLoginClient
            portalKey="mydp"
            portalLabel="mydp"
            roleLabel="Doctor"
            expectedRole="DOCTOR"
            dashboardPath="/dashboard/doctor"
            accentColor="#1d4ed8"
            subtitle="Manage patients, prescriptions, and linked health records securely."
            registerPath="/mydp/register"
        />
    );
}
