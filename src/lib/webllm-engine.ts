/**
 * WebLLM engine singleton.
 *
 * Storing the engine at module level means it is created once per browser
 * session and survives React component unmounts / remounts.
 */

import type { MLCEngine } from "@mlc-ai/web-llm";

const MODEL_ID = "Phi-3.5-mini-instruct-q4f16_1-MLC";

type ProgressCallback = (progress: number, text: string) => void;

let enginePromise: Promise<MLCEngine> | null = null;
let cachedEngine: MLCEngine | null = null;

/**
 * Returns the singleton engine, initialising it if necessary.
 * Subsequent calls while the engine is loading will await the same promise
 * rather than starting a second download.
 */
export function getEngine(onProgress?: ProgressCallback): Promise<MLCEngine> {
    // Already loaded — return immediately
    if (cachedEngine) return Promise.resolve(cachedEngine);

    // Already loading — reuse the in-flight promise
    if (enginePromise) return enginePromise;

    enginePromise = (async () => {
        const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
        const engine = await CreateMLCEngine(MODEL_ID, {
            initProgressCallback: (report) => {
                onProgress?.(Math.round(report.progress * 100), report.text);
            },
        });
        cachedEngine = engine;
        return engine;
    })();

    // Clear the in-flight reference on failure so the next caller retries
    enginePromise.catch(() => {
        enginePromise = null;
    });

    return enginePromise;
}

/** True once the engine has fully loaded. */
export function isEngineReady(): boolean {
    return cachedEngine !== null;
}

/** Pre-warm the engine in the background (no-op if already loading/loaded). */
export function preloadEngine(): void {
    if (!cachedEngine && !enginePromise) {
        getEngine().catch(() => {/* silently ignore preload errors */});
    }
}
