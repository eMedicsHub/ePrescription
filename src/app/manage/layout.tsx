import { ReactNode } from "react";

export default function ManageLayout({ children }: { children: ReactNode }) {
    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "#f9fafb" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {children}
            </div>
        </div>
    );
}
