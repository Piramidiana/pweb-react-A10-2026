export type WorkMode = "Remote" | "Hybrid" | "Onsite"

export type ApplicationStatus =
    | "WISHLIST"
    | "APPLIED"
    | "SCREENING"
    | "INTERVIEW"
    | "OFFER"
    | "REJECTED"
    | "GHOSTED"

export type ChecklistItem = {
    id: string
    text: string
    done: boolean
}

export type ActivityLog = {
    id: string
    timestamp: string
    message: string
}

export type Application = {
    id: string
    company: string
    role: string
    workMode: WorkMode
    status: ApplicationStatus
    requiredSkills: string[]
    cvVersion?: string
    appliedDate?: string
    /** Format YYYY-MM-DDTHH:mm */
    interviewDateTime?: string
    salaryOffer?: number
    /** ISO string, dasar hitung Rawan Ghosting */
    lastUpdatedAt: string
    checklist: ChecklistItem[]
    activityLogs: ActivityLog[]
}

/** Satu item lowongan dari Remotive API maupun public/magang-fallback.json */
export type JobListing = {
    id: number
    title: string
    company_name: string
    category: string
    candidate_required_location: string
    salary: string
    tags: string[]
}

/** Data tambahan yang wajib diisi saat pindah ke status tertentu. */
export type TransitionData = {
    cvVersion?: string
    appliedDate?: string
    interviewDateTime?: string
    salaryOffer?: number
    workMode?: WorkMode
}

export type SkillMatch = {
    /** 0 sampai 100 */
    score: number
    matched: string[]
    missing: string[]
}

export type OfferScore = {
    salaryScore: number
    workModeScore: number
    skillScore: number
    total: number
}

export type OfferComparison = {
    a: OfferScore
    b: OfferScore
    winner: "a" | "b" | "tie"
}
