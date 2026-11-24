import type {
    ActivityLog,
    Application,
    ApplicationStatus,
    TransitionData,
} from "../types"
import { formatRupiah } from "./currency"
import { shiftLastUpdated } from "./ghosting"
import {
    canTransition,
    validateTransitionData,
    type TransitionErrors,
} from "./stateMachine"

/**
 * Semua fungsi di file ini murni dan immutable: lamaran lama tidak pernah
 * diubah, selalu mengembalikan objek baru (spread / map / filter).
 */

export function createLog(
    message: string,
    now: string = new Date().toISOString(),
): ActivityLog {
    return { id: crypto.randomUUID(), timestamp: now, message }
}

export type TransitionResult =
    | { ok: true; application: Application }
    | { ok: false; message: string; errors: TransitionErrors }

type TransitionPatch = Partial<
    Pick<
        Application,
        | "cvVersion"
        | "appliedDate"
        | "interviewDateTime"
        | "salaryOffer"
        | "workMode"
    >
>

function buildPatch(
    application: Application,
    to: ApplicationStatus,
    data: TransitionData,
): { patch: TransitionPatch; detail: string } {
    if (to === "APPLIED") {
        const cvVersion = (data.cvVersion ?? application.cvVersion ?? "").trim()
        const appliedDate = data.appliedDate ?? application.appliedDate
        return {
            patch: { cvVersion, appliedDate },
            detail: ` (CV: ${cvVersion}, tanggal ${appliedDate ?? "-"})`,
        }
    }
    if (to === "INTERVIEW") {
        const interviewDateTime =
            data.interviewDateTime ?? application.interviewDateTime
        return {
            patch: { interviewDateTime },
            detail: ` (jadwal ${(interviewDateTime ?? "-").replace("T", " ")})`,
        }
    }
    if (to === "OFFER") {
        const salaryOffer = data.salaryOffer ?? application.salaryOffer
        const workMode = data.workMode ?? application.workMode
        return {
            patch: { salaryOffer, workMode },
            detail: ` (${formatRupiah(salaryOffer ?? 0)}, ${workMode})`,
        }
    }
    return { patch: {}, detail: "" }
}

/**
 * Pindah status mengikuti state machine.
 * Gagal jika perpindahan tidak sah atau data syarat belum lengkap.
 * Jika berhasil: status baru, data syarat tersimpan, lastUpdatedAt diperbarui
 * (ini yang me-reset hitungan Rawan Ghosting), dan satu log ditambahkan di depan.
 */
export function applyTransition(
    application: Application,
    to: ApplicationStatus,
    data: TransitionData = {},
    now: string = new Date().toISOString(),
): TransitionResult {
    if (!canTransition(application.status, to)) {
        return {
            ok: false,
            message: `Status ${application.status} tidak bisa langsung pindah ke ${to}.`,
            errors: {},
        }
    }

    const errors = validateTransitionData(application, to, data)
    if (Object.keys(errors).length > 0) {
        return {
            ok: false,
            message: "Lengkapi data yang wajib diisi.",
            errors,
        }
    }

    const { patch, detail } = buildPatch(application, to, data)
    const message = `Status ${application.status} → ${to}${detail}`

    return {
        ok: true,
        application: {
            ...application,
            ...patch,
            status: to,
            lastUpdatedAt: now,
            activityLogs: [createLog(message, now), ...application.activityLogs],
        },
    }
}

/**
 * Tombol "Simulasi +15 Hari": memundurkan lastUpdatedAt agar badge Rawan Ghosting
 * bisa diuji saat demo. Dicatat di activity log supaya jelas ini data uji.
 */
export function simulateDays(
    application: Application,
    days: number = 15,
    now: string = new Date().toISOString(),
): Application {
    const shifted = shiftLastUpdated(application, days)
    return {
        ...shifted,
        activityLogs: [
            createLog(`Simulasi +${days} hari (uji Rawan Ghosting)`, now),
            ...shifted.activityLogs,
        ],
    }
}

/** Catatan manual Kapten. Teks kosong diabaikan (objek yang sama dikembalikan). */
export function addNote(
    application: Application,
    text: string,
    now: string = new Date().toISOString(),
): Application {
    const note = text.trim()
    if (!note) return application
    return {
        ...application,
        activityLogs: [createLog(`Catatan: ${note}`, now), ...application.activityLogs],
    }
}

export function addChecklistItem(
    application: Application,
    text: string,
): Application {
    const item = text.trim()
    if (!item) return application
    return {
        ...application,
        checklist: [
            ...application.checklist,
            { id: crypto.randomUUID(), text: item, done: false },
        ],
    }
}

export function toggleChecklistItem(
    application: Application,
    itemId: string,
): Application {
    return {
        ...application,
        checklist: application.checklist.map((item) =>
            item.id === itemId ? { ...item, done: !item.done } : item,
        ),
    }
}

export function removeChecklistItem(
    application: Application,
    itemId: string,
): Application {
    return {
        ...application,
        checklist: application.checklist.filter((item) => item.id !== itemId),
    }
}

export type ChecklistProgress = { done: number; total: number; percent: number }

/** Progress checklist, dihitung langsung saat render (derived state). */
export function getChecklistProgress(application: Application): ChecklistProgress {
    const total = application.checklist.length
    const done = application.checklist.filter((item) => item.done).length
    return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) }
}
