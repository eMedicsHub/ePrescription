import PortalLoginClient from "@/components/PortalLoginClient";

export default function PatientPortalLoginPage() {
    return (
        <PortalLoginClient
            portalKey="mypa"
            portalLabel="mypa"
            roleLabel="Patient"
            expectedRole="PATIENT"
            dashboardPath="/dashboard/patient"
            accentColor="#0f766e"
            subtitle="Access your health timeline, records, and doctor-sharing controls."
            registerPath="/mypa/register"
            allowGoogle
            googleProviderId="google-patient"
        />
    );
}