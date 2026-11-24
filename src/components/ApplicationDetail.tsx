import { useState, type FormEvent } from "react"
import type {
    Application,
    ApplicationStatus,
    TransitionData,
    WorkMode,
} from "../types"
import {
    addChecklistItem,
    addNote,
    applyTransition,
    calculateSkillMatch,
    formatRupiah,
    getChecklistProgress,
    getNextStatuses,
    isFinalStatus,
    isGhostingRisk,
    parseRupiah,
    removeChecklistItem,
    simulateDays,
    toggleChecklistItem,
    type TransitionErrors,
} from "../utils"
import { InterviewPrepPanel } from "./InterviewPrepTimer"
import "./detail.css"

type ApplicationDetailProps = {
    application: Application
    kaptenSkills: string[]
    /** Dipanggil dengan versi baru lamaran; App yang menyimpannya. */
    onUpdate: (next: Application) => void
    onDelete: (id: string) => void
    onClose: () => void
}

type TransitionForm = {
    cvVersion: string
    appliedDate: string
    interviewDateTime: string
    salary: string
    workMode: WorkMode
}

const STAGES: ApplicationStatus[] = [
    "WISHLIST",
    "APPLIED",
    "SCREENING",
    "INTERVIEW",
    "OFFER",
]

function todayLocal(): string {
    return new Date().toLocaleDateString("sv-SE")
}

function initialForm(application: Application): TransitionForm {
    return {
        cvVersion: application.cvVersion ?? "",
        appliedDate: application.appliedDate ?? todayLocal(),
        interviewDateTime: application.interviewDateTime ?? "",
        salary: application.salaryOffer ? String(application.salaryOffer) : "",
        workMode: application.workMode,
    }
}

function formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

export function ApplicationDetail({
    application,
    kaptenSkills,
    onUpdate,
    onDelete,
    onClose,
}: ApplicationDetailProps) {
    const [target, setTarget] = useState<ApplicationStatus | null>(null)
    const [form, setForm] = useState<TransitionForm>(() => initialForm(application))
    const [errors, setErrors] = useState<TransitionErrors>({})
    const [transitionMessage, setTransitionMessage] = useState("")
    const [checklistText, setChecklistText] = useState("")
    const [noteText, setNoteText] = useState("")

    const nextStatuses = getNextStatuses(application.status)
    const progress = getChecklistProgress(application)
    const match = calculateSkillMatch(application.requiredSkills, kaptenSkills)
    const stageIndex = STAGES.indexOf(application.status)
    const canSimulate =
        application.status === "APPLIED" || application.status === "SCREENING"

    function selectTarget(status: ApplicationStatus) {
        setTarget(status)
        setForm(initialForm(application))
        setErrors({})
        setTransitionMessage("")
    }

    function buildData(to: ApplicationStatus): TransitionData {
        if (to === "APPLIED") {
            return { cvVersion: form.cvVersion, appliedDate: form.appliedDate }
        }
        if (to === "INTERVIEW") {
            return { interviewDateTime: form.interviewDateTime }
        }
        if (to === "OFFER") {
            return { salaryOffer: parseRupiah(form.salary), workMode: form.workMode }
        }
        return {}
    }

    function handleConfirm(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!target) return

        const result = applyTransition(application, target, buildData(target))
        if (!result.ok) {
            setErrors(result.errors)
            setTransitionMessage(result.message)
            return
        }
        onUpdate(result.application)
        setTarget(null)
        setErrors({})
        setTransitionMessage("")
    }

    function handleAddChecklist(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const next = addChecklistItem(application, checklistText)
        if (next === application) return
        onUpdate(next)
        setChecklistText("")
    }

    function handleAddNote(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const next = addNote(application, noteText)
        if (next === application) return
        onUpdate(next)
        setNoteText("")
    }

    function updateForm(patch: Partial<TransitionForm>) {
        setForm((current) => ({ ...current, ...patch }))
    }

    return (
        <div className="detail">
            <div className="detail-top">
                <button
                    className="button button-quiet button-small"
                    onClick={onClose}
                    type="button"
                >
                    ← Kembali ke daftar
                </button>
                <div className="detail-top-actions">
                    {canSimulate && (
                        <button
                            className="button button-quiet button-small"
                            onClick={() => onUpdate(simulateDays(application, 15))}
                            type="button"
                        >
                            Simulasi +15 Hari
                        </button>
                    )}
                    <button
                        className="button button-quiet button-danger button-small"
                        onClick={() => onDelete(application.id)}
                        type="button"
                    >
                        Hapus lamaran
                    </button>
                </div>
            </div>

            <header className="detail-header">
                <div>
                    <h2>{application.role}</h2>
                    <p>
                        {application.company} · {application.workMode}
                        {application.cvVersion && ` · CV: ${application.cvVersion}`}
                    </p>
                    <p>
                        Skill Match {match.score}%
                        {match.missing.length > 0 &&
                            ` · perlu dipelajari: ${match.missing.join(", ")}`}
                    </p>
                    {application.interviewDateTime && (
                        <p>Jadwal interview: {application.interviewDateTime.replace("T", " ")}</p>
                    )}
                    {application.salaryOffer !== undefined && (
                        <p>Offer: {formatRupiah(application.salaryOffer)}</p>
                    )}
                </div>
                <div className="detail-badges">
                    <span className={`status-pill status-${application.status.toLowerCase()}`}>
                        {application.status}
                    </span>
                    {isGhostingRisk(application) && (
                        <span className="detail-ghost">Rawan Ghosting</span>
                    )}
                </div>
            </header>

            <div className="detail-grid">
                <div className="detail-column">
                    <section className="detail-section" aria-label="Tahap seleksi">
                        <h3>Tahap seleksi</h3>
                        <ol className="detail-stages">
                            {STAGES.map((stage, index) => {
                                const state =
                                    stageIndex === -1
                                        ? ""
                                        : index < stageIndex
                                          ? "stage-done"
                                          : index === stageIndex
                                            ? "stage-current"
                                            : ""
                                return (
                                    <li className={state} key={stage}>
                                        {stage}
                                    </li>
                                )
                            })}
                        </ol>

                        {isFinalStatus(application.status) ? (
                            <p className="detail-hint">
                                Status {application.status} bersifat final dan tidak
                                bisa diubah lagi.
                            </p>
                        ) : (
                            <>
                                <div className="detail-targets">
                                    <span>Pindahkan status ke:</span>
                                    {nextStatuses.map((status) => (
                                        <button
                                            aria-pressed={target === status}
                                            className={
                                                target === status
                                                    ? "button button-primary button-small"
                                                    : "button button-secondary button-small"
                                            }
                                            key={status}
                                            onClick={() => selectTarget(status)}
                                            type="button"
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>

                                {target && (
                                    <form
                                        className="detail-transition"
                                        noValidate
                                        onSubmit={handleConfirm}
                                    >
                                        {target === "APPLIED" && (
                                            <>
                                                <label className="form-field">
                                                    <span>Versi CV <b>*</b></span>
                                                    <input
                                                        aria-invalid={Boolean(errors.cvVersion)}
                                                        onChange={(event) =>
                                                            updateForm({ cvVersion: event.target.value })
                                                        }
                                                        placeholder="Contoh: CV-Frontend-v2"
                                                        value={form.cvVersion}
                                                    />
                                                    {errors.cvVersion && (
                                                        <small className="field-error">{errors.cvVersion}</small>
                                                    )}
                                                </label>
                                                <label className="form-field">
                                                    <span>Tanggal melamar <b>*</b></span>
                                                    <input
                                                        aria-invalid={Boolean(errors.appliedDate)}
                                                        onChange={(event) =>
                                                            updateForm({ appliedDate: event.target.value })
                                                        }
                                                        type="date"
                                                        value={form.appliedDate}
                                                    />
                                                    {errors.appliedDate && (
                                                        <small className="field-error">{errors.appliedDate}</small>
                                                    )}
                                                </label>
                                            </>
                                        )}

                                        {target === "INTERVIEW" && (
                                            <label className="form-field">
                                                <span>Jadwal interview <b>*</b></span>
                                                <input
                                                    aria-invalid={Boolean(errors.interviewDateTime)}
                                                    onChange={(event) =>
                                                        updateForm({ interviewDateTime: event.target.value })
                                                    }
                                                    type="datetime-local"
                                                    value={form.interviewDateTime}
                                                />
                                                {errors.interviewDateTime && (
                                                    <small className="field-error">{errors.interviewDateTime}</small>
                                                )}
                                            </label>
                                        )}

                                        {target === "OFFER" && (
                                            <>
                                                <label className="form-field">
                                                    <span>Uang saku / bulan (Rp) <b>*</b></span>
                                                    <input
                                                        aria-invalid={Boolean(errors.salaryOffer)}
                                                        inputMode="numeric"
                                                        onChange={(event) =>
                                                            updateForm({ salary: event.target.value })
                                                        }
                                                        placeholder="Contoh: 5500000"
                                                        value={form.salary}
                                                    />
                                                    {errors.salaryOffer && (
                                                        <small className="field-error">{errors.salaryOffer}</small>
                                                    )}
                                                </label>
                                                <label className="form-field">
                                                    <span>Mode kerja <b>*</b></span>
                                                    <select
                                                        onChange={(event) =>
                                                            updateForm({ workMode: event.target.value as WorkMode })
                                                        }
                                                        value={form.workMode}
                                                    >
                                                        <option value="Remote">Remote</option>
                                                        <option value="Hybrid">Hybrid</option>
                                                        <option value="Onsite">Onsite</option>
                                                    </select>
                                                </label>
                                            </>
                                        )}

                                        {transitionMessage && (
                                            <p className="form-alert" role="alert">
                                                {transitionMessage}
                                            </p>
                                        )}
                                        <button className="button button-primary" type="submit">
                                            Konfirmasi pindah ke {target}
                                        </button>
                                    </form>
                                )}
                            </>
                        )}
                    </section>

                    <section className="detail-section" aria-label="Daftar persiapan">
                        <div className="detail-section-head">
                            <h3>Daftar persiapan</h3>
                            <span className="detail-count">
                                {progress.done}/{progress.total} selesai
                            </span>
                        </div>
                        <div
                            aria-label="Progress checklist"
                            aria-valuemax={100}
                            aria-valuemin={0}
                            aria-valuenow={progress.percent}
                            className="detail-progress"
                            role="progressbar"
                        >
                            <span style={{ width: `${progress.percent}%` }} />
                        </div>

                        {application.checklist.length === 0 ? (
                            <p className="detail-hint">Belum ada tugas persiapan.</p>
                        ) : (
                            <ul className="detail-checklist">
                                {application.checklist.map((item) => (
                                    <li key={item.id}>
                                        <label className={item.done ? "check-done" : ""}>
                                            <input
                                                checked={item.done}
                                                onChange={() => onUpdate(toggleChecklistItem(application, item.id))}
                                                type="checkbox"
                                            />
                                            <span>{item.text}</span>
                                        </label>
                                        <button
                                            aria-label={`Hapus tugas ${item.text}`}
                                            className="button button-quiet button-small"
                                            onClick={() => onUpdate(removeChecklistItem(application, item.id))}
                                            type="button"
                                        >
                                            ×
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <form className="detail-inline-form" onSubmit={handleAddChecklist}>
                            <label className="sr-only" htmlFor="checklist-input">
                                Tambah tugas persiapan
                            </label>
                            <input
                                id="checklist-input"
                                onChange={(event) => setChecklistText(event.target.value)}
                                placeholder="Tambah tugas persiapan baru..."
                                value={checklistText}
                            />
                            <button className="button button-primary button-small" type="submit">
                                Tambah
                            </button>
                        </form>
                    </section>
                </div>

                <div className="detail-column">
                    <section className="detail-section" aria-label="Latihan interview">
                        <h3>Latihan interview</h3>
                        <InterviewPrepPanel />
                    </section>

                    <section className="detail-section" aria-label="Riwayat aktivitas">
                        <h3>Riwayat aktivitas</h3>
                        <form className="detail-inline-form" onSubmit={handleAddNote}>
                            <label className="sr-only" htmlFor="note-input">
                                Catatan manual
                            </label>
                            <input
                                id="note-input"
                                onChange={(event) => setNoteText(event.target.value)}
                                placeholder="Tulis catatan..."
                                value={noteText}
                            />
                            <button className="button button-secondary button-small" type="submit">
                                Simpan
                            </button>
                        </form>

                        {application.activityLogs.length === 0 ? (
                            <p className="detail-hint">Belum ada aktivitas.</p>
                        ) : (
                            <ul className="detail-log">
                                {application.activityLogs.map((log) => (
                                    <li key={log.id}>
                                        <time dateTime={log.timestamp}>
                                            {formatTimestamp(log.timestamp)}
                                        </time>
                                        <span>{log.message}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
        </div>
    )
}
