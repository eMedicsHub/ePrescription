import PortalLoginClient from "@/components/auth/PortalLoginClient";

export default function PharmacistPortalLoginPage() {
    return (
        <PortalLoginClient
            portalKey="myph"
            portalLabel="myph"
            roleLabel="Pharmacist"
            expectedRole="PHARMACIST"
            dashboardPath="/dashboard/pharmacist"
            accentColor="#7c3aed"
            subtitle="Review prescriptions, dispense medication, and manage fulfillment status."
            registerPath="/myph/register"
        />
    );
}
