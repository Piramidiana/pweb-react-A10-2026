import type { Application } from "../types"

export const GHOSTING_THRESHOLD_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Rawan Ghosting: status APPLIED atau SCREENING yang tidak berubah > 14 hari.
 * Hitung langsung saat render (derived state); `now` bisa disuntik untuk tes.
 */
export function isGhostingRisk(
    application: Application,
    now: number = Date.now(),
): boolean {
    if (application.status !== "APPLIED" && application.status !== "SCREENING") {
        return false
    }
    const updatedAt = new Date(application.lastUpdatedAt).getTime()
    if (Number.isNaN(updatedAt)) return false
    return now - updatedAt > GHOSTING_THRESHOLD_DAYS * DAY_MS
}

/** Untuk tombol "Simulasi +15 Hari": mundurkan lastUpdatedAt sebanyak `days` hari. */
export function shiftLastUpdated(
    application: Application,
    days: number = 15,
): Application {
    const shifted = new Date(
        new Date(application.lastUpdatedAt).getTime() - days * DAY_MS,
    )
    return { ...application, lastUpdatedAt: shifted.toISOString() }
}
