import type { JobListing } from "../types"

export type JobSource = "live" | "fallback"

export const REMOTIVE_URL =
    "https://remotive.com/api/remote-jobs?category=software-dev&limit=30"
export const FALLBACK_URL = "/magang-fallback.json"

export class JobServiceError extends Error {
    readonly source: JobSource

    constructor(message: string, source: JobSource) {
        super(message)
        this.name = "JobServiceError"
        this.source = source
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}

function isJobListing(value: unknown): value is JobListing {
    return (
        isRecord(value) &&
        typeof value.id === "number" &&
        typeof value.title === "string" &&
        typeof value.company_name === "string" &&
        typeof value.category === "string" &&
        typeof value.candidate_required_location === "string" &&
        typeof value.salary === "string" &&
        Array.isArray(value.tags) &&
        value.tags.every((tag) => typeof tag === "string")
    )
}

/** Remotive mengirim { jobs: [...] }; berkas lokal boleh array langsung atau { jobs }. */
function extractListings(body: unknown): unknown[] {
    if (Array.isArray(body)) return body
    if (isRecord(body) && Array.isArray(body.jobs)) return body.jobs
    return []
}

/**
 * Ambil lowongan dari Remotive (live) atau public/magang-fallback.json (fallback).
 * Teruskan `signal` dari AbortController; AbortError sengaja dilempar apa adanya
 * supaya pemanggil (useEffect cleanup) bisa mengabaikannya.
 */
export async function fetchJobs(
    source: JobSource,
    signal?: AbortSignal,
): Promise<JobListing[]> {
    const url = source === "live" ? REMOTIVE_URL : FALLBACK_URL

    let response: Response
    try {
        response = await fetch(url, { signal })
    } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") {
            throw reason
        }
        throw new JobServiceError(
            "Gagal terhubung. Periksa koneksi internet.",
            source,
        )
    }

    if (!response.ok) {
        throw new JobServiceError(
            `Server menjawab dengan status ${response.status}.`,
            source,
        )
    }

    let body: unknown
    try {
        body = await response.json()
    } catch {
        throw new JobServiceError("Format data lowongan tidak valid.", source)
    }

    return extractListings(body).filter(isJobListing)
}
