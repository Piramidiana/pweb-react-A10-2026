import type { Application } from "../types"
import { isGhostingRisk } from "./ghosting"

export type DashboardStats = {
    total: number
    responseRate: number
    interviewRate: number
    ghostingRisk: number
    totalOffer: number
}

function percent(part: number, whole: number): number {
    return whole === 0 ? 0 : Math.round((part / whole) * 100)
}

/**
 * Semua angka dihitung langsung dari applications (derived state).
 * Pembagi = total lamaran (sesuai wireframe: "7 dari 12 diproses" = 58%).
 * Response rate : lamaran yang sudah diproses (SCREENING, INTERVIEW, OFFER, REJECTED).
 * Interview rate: lamaran yang masuk wawancara (INTERVIEW atau OFFER).
 */
export function calculateStats(
    applications: Application[],
    now: number = Date.now(),
): DashboardStats {
    const total = applications.length
    const responded = applications.filter((item) =>
        ["SCREENING", "INTERVIEW", "OFFER", "REJECTED"].includes(item.status),
    )
    const interviewed = applications.filter((item) =>
        ["INTERVIEW", "OFFER"].includes(item.status),
    )

    return {
        total,
        responseRate: percent(responded.length, total),
        interviewRate: percent(interviewed.length, total),
        ghostingRisk: applications.filter((item) => isGhostingRisk(item, now))
            .length,
        totalOffer: applications.filter((item) => item.status === "OFFER")
            .length,
    }
}
