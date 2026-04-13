import "dotenv/config";
import { defineConfig } from "prisma/config";

const baseUrl = process.env["DATABASE_URL"];
const tenantId = (process.env["TENANT_ID"] || "public").toLowerCase().replace(/[^a-z0-9_]/g, "_");

if (!baseUrl) {
    throw new Error("DATABASE_URL is not configured");
}

// Append a libpq-style options param so Postgres connection sets search_path
// This ensures both migrations and shadow DB operations run in the tenant schema.
function withSearchPath(urlStr: string, schemaName: string) {
    try {
        const u = new URL(urlStr);
        // preserve existing options param if present
        const existing = u.searchParams.get("options") || "";
        const searchPathClause = `-c search_path=${schemaName}`;
        const combined = existing ? `${existing} ${searchPathClause}` : searchPathClause;
        u.searchParams.set("options", combined.trim());
        return u.toString();
    } catch (e) {
        return urlStr;
    }
}

const tenantAwareUrl = withSearchPath(baseUrl, tenantId);

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: tenantAwareUrl,
    },
});
