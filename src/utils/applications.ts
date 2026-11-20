import type { Application } from "../types"

function normalizeText(value: string): string {
    return value.trim().toLowerCase()
}

/** Pasangan company + role yang sama tidak boleh dilamar dua kali. */
export function isDuplicateApplication(
    applications: Application[],
    company: string,
    role: string,
): boolean {
    const companyKey = normalizeText(company)
    const roleKey = normalizeText(role)
    return applications.some(
        (item) =>
            normalizeText(item.company) === companyKey &&
            normalizeText(item.role) === roleKey,
    )
}

/** "React, TypeScript , css" menjadi ["React", "TypeScript", "css"] tanpa duplikat. */
export function parseSkillList(input: string): string[] {
    const seen = new Set<string>()
    const result: string[] = []
    for (const part of input.split(",")) {
        const skill = part.trim()
        const key = skill.toLowerCase()
        if (skill && !seen.has(key)) {
            seen.add(key)
            result.push(skill)
        }
    }
    return result
}
