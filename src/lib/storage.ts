import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import crypto from "crypto";

type UploadPatientRecordInput = {
    file: File;
    patientUniversalId: string;
    category: string;
    recordId: string;
};

function getBlobContainerClient() {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

    if (!accountName || !containerName) {
        throw new Error("Azure Blob Storage is not configured");
    }

    const credential = new DefaultAzureCredential();
    const serviceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        credential,
    );

    return serviceClient.getContainerClient(containerName);
}

function sanitizeSegment(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9-_.]/g, "-");
}

export async function uploadPatientRecordBlob(input: UploadPatientRecordInput) {
    const buffer = Buffer.from(await input.file.arrayBuffer());
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
    const occurredAt = new Date();
    const year = occurredAt.getUTCFullYear();
    const month = String(occurredAt.getUTCMonth() + 1).padStart(2, "0");
    const extension = input.file.name.includes(".") ? input.file.name.slice(input.file.name.lastIndexOf(".")) : "";
    const blobName = [
        "patient-records",
        sanitizeSegment(input.patientUniversalId),
        sanitizeSegment(input.category),
        String(year),
        month,
        `${input.recordId}${extension}`,
    ].join("/");

    const containerClient = getBlobContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: {
            blobContentType: input.file.type || "application/octet-stream",
        },
        metadata: {
            checksum,
            patientuniversalid: sanitizeSegment(input.patientUniversalId),
            category: sanitizeSegment(input.category),
        },
    });

    return {
        blobName,
        checksum,
        sizeBytes: buffer.byteLength,
        mimeType: input.file.type || "application/octet-stream",
        originalFileName: input.file.name,
    };
}

export async function downloadPatientRecordBlob(storagePath: string) {
    const containerClient = getBlobContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(storagePath);
    const response = await blockBlobClient.download();

    if (!response.readableStreamBody) {
        throw new Error("Blob body was empty");
    }

    return {
        stream: response.readableStreamBody,
        mimeType: response.contentType || "application/octet-stream",
        contentLength: response.contentLength,
    };
}