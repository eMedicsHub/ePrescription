import PortalLoginClient from "@/components/PortalLoginClient";

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
            allowGoogle
            googleProviderId="google-pharmacist"
        />
    );
}