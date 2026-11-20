import type {
    Application,
    ApplicationStatus,
    TransitionData,
} from "../types"

/**
 * Aturan perpindahan status (Diagram State Machine).
 * Key = status asal, value = status tujuan yang sah.
 * OFFER dan REJECTED final. GHOSTED hanya boleh kembali ke SCREENING.
 * Tabel disusun dari aturan soal dan wireframe (dari INTERVIEW: Offer, Rejected, Ghosted).
 * Jika asisten mengumumkan diagram berbeda, cukup ubah tabel ini; semua fitur membaca dari sini.
 */
export const TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
    WISHLIST: ["APPLIED"],
    APPLIED: ["SCREENING", "REJECTED", "GHOSTED"],
    SCREENING: ["INTERVIEW", "REJECTED", "GHOSTED"],
    INTERVIEW: ["OFFER", "REJECTED", "GHOSTED"],
    OFFER: [],
    REJECTED: [],
    GHOSTED: ["SCREENING"],
}

export function getNextStatuses(status: ApplicationStatus): ApplicationStatus[] {
    return TRANSITIONS[status]
}

export function canTransition(
    from: ApplicationStatus,
    to: ApplicationStatus,
): boolean {
    return TRANSITIONS[from].includes(to)
}

export function isFinalStatus(status: ApplicationStatus): boolean {
    return TRANSITIONS[status].length === 0
}

export type TransitionErrors = Partial<
    Record<keyof TransitionData, string>
>

/**
 * Validasi data wajib untuk pindah ke status `to`.
 * Mengembalikan objek kosong jika valid.
 *  - APPLIED   : cvVersion dan appliedDate
 *  - INTERVIEW : interviewDateTime
 *  - OFFER     : salaryOffer > 0 dan workMode
 */
export function validateTransitionData(
    application: Application,
    to: ApplicationStatus,
    data: TransitionData,
): TransitionErrors {
    const errors: TransitionErrors = {}

    if (to === "APPLIED") {
        const cv = data.cvVersion ?? application.cvVersion
        const date = data.appliedDate ?? application.appliedDate
        if (!cv?.trim()) errors.cvVersion = "Versi CV wajib diisi."
        if (!date?.trim()) errors.appliedDate = "Tanggal lamaran wajib diisi."
    }

    if (to === "INTERVIEW") {
        const when = data.interviewDateTime ?? application.interviewDateTime
        if (!when?.trim()) {
            errors.interviewDateTime = "Jadwal interview wajib diisi."
        }
    }

    if (to === "OFFER") {
        const salary = data.salaryOffer ?? application.salaryOffer
        const mode = data.workMode ?? application.workMode
        if (salary === undefined || !Number.isFinite(salary) || salary <= 0) {
            errors.salaryOffer = "Gaji offer harus lebih dari 0."
        }
        if (!mode) errors.workMode = "Mode kerja wajib diisi."
    }

    return errors
}
