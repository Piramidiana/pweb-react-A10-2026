import type { Application, ApplicationStatus } from "../types"
import { isGhostingRisk } from "./ghosting"

export const ALL_STATUSES: ApplicationStatus[] = [
    "WISHLIST",
    "APPLIED",
    "SCREENING",
    "INTERVIEW",
    "OFFER",
    "REJECTED",
    "GHOSTED",
]

export type StatusFilter = ApplicationStatus | "ALL"
export type PipelineSort = "newest" | "interview" | "offer"

export const SORT_OPTIONS: PipelineSort[] = ["newest", "interview", "offer"]

export const SORT_LABELS: Record<PipelineSort, string> = {
    newest: "Terbaru",
    interview: "Jadwal interview terdekat",
    offer: "Offer tertinggi",
}

export type PipelineFilters = {
    query: string
    status: StatusFilter
    ghostingOnly: boolean
    sort: PipelineSort
}

export const DEFAULT_FILTERS: PipelineFilters = {
    query: "",
    status: "ALL",
    ghostingOnly: false,
    sort: "newest",
}

/** Nilai <select> selalu string; type guard ini menggantikan cast "as". */
export function parseStatusFilter(value: string): StatusFilter {
    return ALL_STATUSES.find((status) => status === value) ?? "ALL"
}

export function parseSort(value: string): PipelineSort {
    return value === "interview" || value === "offer" ? value : "newest"
}

function matchesQuery(application: Application, query: string): boolean {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return true
    const haystack = [
        application.company,
        application.role,
        application.cvVersion ?? "",
        ...application.requiredSkills,
    ]
        .join(" ")
        .toLowerCase()
    return haystack.includes(keyword)
}

/**
 * Filter gabungan: teks, status, dan toggle Rawan Ghosting berlaku bersamaan (AND).
 * Murni dan tidak mengubah array asal.
 */
export function filterApplications(
    applications: Application[],
    filters: PipelineFilters,
    now: number = Date.now(),
): Application[] {
    return applications.filter(
        (application) =>
            matchesQuery(application, filters.query) &&
            (filters.status === "ALL" || application.status === filters.status) &&
            (!filters.ghostingOnly || isGhostingRisk(application, now)),
    )
}

/** Waktu lamaran dibuat = log paling awal (log terbaru ada di depan). */
function createdTime(application: Application): number {
    const times = application.activityLogs
        .map((log) => new Date(log.timestamp).getTime())
        .filter((time) => !Number.isNaN(time))
    if (times.length > 0) return Math.min(...times)
    const fallback = new Date(application.lastUpdatedAt).getTime()
    return Number.isNaN(fallback) ? 0 : fallback
}

/** Jadwal hanya dihitung untuk lamaran yang masih INTERVIEW (sama seperti cek bentrok). */
function scheduledTime(application: Application): number | null {
    if (application.status !== "INTERVIEW" || !application.interviewDateTime) {
        return null
    }
    const time = new Date(application.interviewDateTime).getTime()
    return Number.isNaN(time) ? null : time
}

/**
 * Urutan:
 *  - newest   : paling baru ditambahkan dulu
 *  - interview: jadwal yang akan datang (terdekat dulu), lalu yang sudah lewat, lalu tanpa jadwal
 *  - offer    : gaji offer terbesar dulu, tanpa gaji di akhir
 */
export function sortApplications(
    applications: Application[],
    sort: PipelineSort,
    now: number = Date.now(),
): Application[] {
    const copy = [...applications]

    if (sort === "newest") {
        return copy.sort((a, b) => createdTime(b) - createdTime(a))
    }

    if (sort === "offer") {
        return copy.sort((a, b) => (b.salaryOffer ?? -1) - (a.salaryOffer ?? -1))
    }

    return copy.sort((a, b) => {
        const timeA = scheduledTime(a)
        const timeB = scheduledTime(b)
        if (timeA === null && timeB === null) return 0
        if (timeA === null) return 1
        if (timeB === null) return -1
        const upcomingA = timeA >= now
        const upcomingB = timeB >= now
        if (upcomingA !== upcomingB) return upcomingA ? -1 : 1
        return upcomingA ? timeA - timeB : timeB - timeA
    })
}

export function getPipelineView(
    applications: Application[],
    filters: PipelineFilters,
    now: number = Date.now(),
): Application[] {
    return sortApplications(
        filterApplications(applications, filters, now),
        filters.sort,
        now,
    )
}
