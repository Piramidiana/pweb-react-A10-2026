import type { SkillMatch } from "../types"

export function normalizeSkill(skill: string): string {
    return skill.trim().toLowerCase()
}

/** True jika skill sudah ada (huruf besar/kecil tidak berpengaruh). */
export function hasSkill(skills: string[], skill: string): boolean {
    const target = normalizeSkill(skill)
    return skills.some((item) => normalizeSkill(item) === target)
}

/**
 * Skill Match: Math.round((jumlahCocok / totalRequired) * 100), case-insensitive.
 * Skill yang diminta tetapi belum dimiliki masuk ke `missing`.
 */
export function calculateSkillMatch(
    requiredSkills: string[],
    ownedSkills: string[],
): SkillMatch {
    const owned = new Set(ownedSkills.map(normalizeSkill))
    const matched: string[] = []
    const missing: string[] = []

    for (const skill of requiredSkills) {
        if (owned.has(normalizeSkill(skill))) matched.push(skill)
        else missing.push(skill)
    }

    const total = requiredSkills.length
    const score = total === 0 ? 0 : Math.round((matched.length / total) * 100)

    return { score, matched, missing }
}

export type MatchTone = "green" | "yellow" | "red"

/** Hijau >= 70%, kuning 40-69%, merah < 40%. */
export function getMatchTone(score: number): MatchTone {
    if (score >= 70) return "green"
    if (score >= 40) return "yellow"
    return "red"
}
