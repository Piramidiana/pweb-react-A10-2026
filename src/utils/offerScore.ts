import type { Application, OfferComparison, OfferScore, WorkMode } from "../types"
import { calculateSkillMatch } from "./skillMatch"

export const WORK_MODE_SCORE: Record<WorkMode, number> = {
    Remote: 100,
    Hybrid: 75,
    Onsite: 50,
}

const WEIGHT_SALARY = 0.5
const WEIGHT_WORK_MODE = 0.25
const WEIGHT_SKILL = 0.25

/** Normalisasi gaji terhadap gaji tertinggi di antara offer yang dibandingkan (0-100). */
export function normalizeSalary(salary: number, maxSalary: number): number {
    if (maxSalary <= 0) return 0
    return (salary / maxSalary) * 100
}

/**
 * Total = (Normalisasi Gaji x 50%) + (Skor Mode Kerja x 25%) + (Skill Match % x 25%).
 */
export function scoreOffer(
    application: Application,
    maxSalary: number,
    ownedSkills: string[],
): OfferScore {
    const salaryScore = normalizeSalary(application.salaryOffer ?? 0, maxSalary)
    const workModeScore = WORK_MODE_SCORE[application.workMode]
    const skillScore = calculateSkillMatch(
        application.requiredSkills,
        ownedSkills,
    ).score
    const total =
        salaryScore * WEIGHT_SALARY +
        workModeScore * WEIGHT_WORK_MODE +
        skillScore * WEIGHT_SKILL

    return { salaryScore, workModeScore, skillScore, total }
}

export function compareOffers(
    offerA: Application,
    offerB: Application,
    ownedSkills: string[],
): OfferComparison {
    const maxSalary = Math.max(offerA.salaryOffer ?? 0, offerB.salaryOffer ?? 0)
    const a = scoreOffer(offerA, maxSalary, ownedSkills)
    const b = scoreOffer(offerB, maxSalary, ownedSkills)
    const winner = a.total === b.total ? "tie" : a.total > b.total ? "a" : "b"
    return { a, b, winner }
}
