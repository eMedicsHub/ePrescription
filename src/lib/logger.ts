type LogLevel = "debug" | "info" | "warn" | "error";

const levelWeight: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

const configuredLevel = ((process.env.LOG_LEVEL || "info").toLowerCase() as LogLevel);
const minLevel = levelWeight[configuredLevel] ?? levelWeight.info;

function shouldLog(level: LogLevel) {
    return levelWeight[level] >= minLevel;
}

function sanitize(data: Record<string, unknown> = {}) {
    const hidden = new Set(["password", "token", "authorization"]);
    return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, hidden.has(k.toLowerCase()) ? "***" : v]));
}

export function appLog(level: LogLevel, message: string, meta: Record<string, unknown> = {}) {
    if (!shouldLog(level)) return;
    const entry = {
        ts: new Date().toISOString(),
        level,
        msg: message,
        service: "eprescription-web",
        ...sanitize(meta),
    };
    const line = JSON.stringify(entry);
    if (level === "error") {
        console.error(line);
        return;
    }
    if (level === "warn") {
        console.warn(line);
        return;
    }
    console.log(line);
}

export function createRequestContext(req: Request, extras: Record<string, unknown> = {}) {
    const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
    return {
        requestId,
        method: req.method,
        path: new URL(req.url).pathname,
        ...extras,
    };
}
