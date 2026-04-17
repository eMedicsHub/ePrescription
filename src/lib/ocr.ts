import { appLog } from "@/lib/logger";

export type ParsedOcrData = {
    title?: string;
    category?: "LAB_REPORT" | "PRESCRIPTION" | "OTHER";
    reportDate?: string | null;
    reports?: string[];
    labResults?: Array<{
        testProfile?: string;
        test?: string;
        result?: string;
        flag?: string;
        refLow?: string;
        refHigh?: string;
    }>;
    immunizations?: Array<{
        vaccine: string;
        doseNumber?: string;
        administeredAt?: string | null;
    }>;
    medications?: Array<{
        name: string;
        dosage?: string;
        frequency?: string;
        duration?: string;
    }>;
    rawText?: string;
};

function tryExtractByRegex(text: string): ParsedOcrData {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const labRows: Array<{
        testProfile?: string;
        test?: string;
        result?: string;
        flag?: string;
        refLow?: string;
        refHigh?: string;
    }> = lines
        .map((line) => {
            const parts = line.split("|").map((p) => p.trim());
            if (parts.length < 4) return null;
            const [test, result, flag, ref] = parts;
            const [refLow, refHigh] = (ref || "").split("-").map((v) => v.trim());
            return { test, result, flag, refLow, refHigh, testProfile: "OCR Imported" };
        })
        .filter(Boolean) as Array<any>;

    if (labRows.length > 0) {
        return {
            title: "OCR Lab Report",
            category: "LAB_REPORT",
            reports: ["OCR Imported"],
            labResults: labRows,
            rawText: text.slice(0, 8000),
        };
    }

    return {
        title: "OCR Imported Document",
        category: "OTHER",
        rawText: text.slice(0, 8000),
    };
}

export async function extractTextFromDocument(file: File): Promise<{ text: string; provider: string }> {
    const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
    const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
    if (!endpoint || !key) {
        if (file.type.startsWith("text/")) {
            return { text: await file.text(), provider: "local-text" };
        }
        throw new Error("OCR provider not configured");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const analyzeUrl = `${endpoint.replace(/\/$/, "")}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-02-29-preview`;
    const res = await fetch(analyzeUrl, {
        method: "POST",
        headers: {
            "Ocp-Apim-Subscription-Key": key,
            "Content-Type": "application/pdf",
        },
        body: bytes,
    });
    if (!res.ok) {
        throw new Error(`OCR analyze failed (${res.status})`);
    }
    const opLocation = res.headers.get("operation-location");
    if (!opLocation) {
        throw new Error("OCR analyze operation-location missing");
    }

    for (let i = 0; i < 20; i += 1) {
        await new Promise((r) => setTimeout(r, 1000));
        const poll = await fetch(opLocation, { headers: { "Ocp-Apim-Subscription-Key": key } });
        const data = await poll.json();
        if (data.status === "succeeded") {
            const text = (data.analyzeResult?.content || "") as string;
            return { text, provider: "azure-document-intelligence" };
        }
        if (data.status === "failed") {
            throw new Error("OCR provider failed");
        }
    }
    throw new Error("OCR timed out");
}

export async function runOcrAndParse(file: File): Promise<{ parsed: ParsedOcrData; provider: string }> {
    const { text, provider } = await extractTextFromDocument(file);
    const parsed = tryExtractByRegex(text);
    appLog("info", "OCR parsing completed", { provider, chars: text.length });
    return { parsed, provider };
}
