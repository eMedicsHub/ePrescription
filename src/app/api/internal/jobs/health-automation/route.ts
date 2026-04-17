import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { appLog, createRequestContext } from "@/lib/logger";
import { MedicationAdherenceStatus, ReminderStatus } from "@prisma/client";

function isAuthorized(req: Request) {
    const token = process.env.CRON_SECRET;
    if (!token) return false;
    const auth = req.headers.get("authorization") || "";
    return auth === `Bearer ${token}`;
}

export async function POST(req: Request) {
    const ctx = createRequestContext(req, { job: "health-automation" });
    if (!isAuthorized(req)) {
        appLog("warn", "Unauthorized cron invocation", ctx);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const missedGraceMins = Number(process.env.ADHERENCE_MISSED_GRACE_MINUTES || "120");
    const missedCutoff = new Date(now.getTime() - missedGraceMins * 60 * 1000);

    const [reminders, doses] = await prisma.$transaction([
        prisma.appointmentReminder.updateMany({
            where: {
                status: ReminderStatus.PENDING,
                reminderAt: { lte: now },
            },
            data: {
                status: ReminderStatus.SENT,
                deliveredAt: now,
            },
        }),
        prisma.medicationAdherenceLog.updateMany({
            where: {
                status: MedicationAdherenceStatus.PENDING,
                scheduledFor: { lte: missedCutoff },
            },
            data: {
                status: MedicationAdherenceStatus.MISSED,
                notes: "Auto-marked missed by scheduler",
            },
        }),
    ]);

    const payload = {
        ok: true,
        now: now.toISOString(),
        remindersSent: reminders.count,
        dosesMarkedMissed: doses.count,
    };
    appLog("info", "Health automation job completed", { ...ctx, ...payload });
    return NextResponse.json(payload);
}
