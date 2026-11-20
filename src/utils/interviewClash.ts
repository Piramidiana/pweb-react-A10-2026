import type { Application } from "../types"

export const CLASH_WINDOW_MINUTES = 60

export type InterviewClash = {
    first: Application
    second: Application
    minutesApart: number
}

function interviewTime(application: Application): number | null {
    if (application.status !== "INTERVIEW" || !application.interviewDateTime) {
        return null
    }
    const time = new Date(application.interviewDateTime).getTime()
    return Number.isNaN(time) ? null : time
}

/**
 * Cari pasangan lamaran INTERVIEW yang berselisih < 60 menit.
 * Wajib dipanggil dengan SELURUH data, bukan data yang sudah difilter.
 */
export function findInterviewClashes(
    applications: Application[],
): InterviewClash[] {
    const scheduled = applications
        .map((application) => ({ application, time: interviewTime(application) }))
        .filter(
            (item): item is { application: Application; time: number } =>
                item.time !== null,
        )
        .sort((a, b) => a.time - b.time)

    const clashes: InterviewClash[] = []
    for (let i = 0; i < scheduled.length; i++) {
        for (let j = i + 1; j < scheduled.length; j++) {
            const first = scheduled[i]
            const second = scheduled[j]
            if (!first || !second) continue
            const minutesApart = (second.time - first.time) / 60000
            if (minutesApart >= CLASH_WINDOW_MINUTES) break
            clashes.push({
                first: first.application,
                second: second.application,
                minutesApart,
            })
        }
    }
    return clashes
}
