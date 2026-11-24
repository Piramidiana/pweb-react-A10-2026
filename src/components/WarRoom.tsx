import { useState } from "react"
import type { Application } from "../types"
import {
    ALL_STATUSES,
    DEFAULT_FILTERS,
    SORT_LABELS,
    SORT_OPTIONS,
    calculateSkillMatch,
    formatDateTime,
    getChecklistProgress,
    getMatchTone,
    getPipelineView,
    isGhostingRisk,
    parseSort,
    parseStatusFilter,
    simulateDays,
    type PipelineFilters,
} from "../utils"
import "./war.css"

type WarRoomProps = {
    applications: Application[]
    kaptenSkills: string[]
    onOpen: (id: string) => void
    onUpdate: (next: Application) => void
    onDelete: (id: string) => void
    onAdd: () => void
}

export function WarRoom({
    applications,
    kaptenSkills,
    onOpen,
    onUpdate,
    onDelete,
    onAdd,
}: WarRoomProps) {
    const [filters, setFilters] = useState<PipelineFilters>(DEFAULT_FILTERS)

    // Semua turunan dihitung langsung saat render, tanpa useState tambahan.
    const visible = getPipelineView(applications, filters)
    const ghostingCount = applications.filter((item) => isGhostingRisk(item)).length
    const filtersActive =
        filters.query.trim() !== "" ||
        filters.status !== "ALL" ||
        filters.ghostingOnly

    function patchFilters(patch: Partial<PipelineFilters>) {
        setFilters((current) => ({ ...current, ...patch }))
    }

    return (
        <div className="war-room">
            <div className="section-heading">
                <div>
                    <p className="eyebrow">RUANG KENDALI</p>
                    <h2>War Room lamaran</h2>
                    <p className="section-description">
                        Pantau status, checklist, dan lamaran yang rawan di-ghosting.
                        Data tersimpan otomatis di browser ini.
                    </p>
                </div>
                <button className="button button-primary" onClick={onAdd} type="button">
                    + Tambah lamaran
                </button>
            </div>

            {applications.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-icon">+</span>
                    <h3>Belum ada lamaran</h3>
                    <p>Simpan lowongan atau tambahkan lamaran secara manual.</p>
                    <button className="button button-secondary" onClick={onAdd} type="button">
                        Tambah lamaran
                    </button>
                </div>
            ) : (
                <>
                    <div className="war-filters">
                        <label className="war-search">
                            <span className="sr-only">Cari lamaran</span>
                            <input
                                onChange={(event) => patchFilters({ query: event.target.value })}
                                placeholder="Cari perusahaan, posisi, CV, atau skill..."
                                value={filters.query}
                            />
                        </label>
                        <label className="war-select">
                            <span className="sr-only">Filter status</span>
                            <select
                                onChange={(event) =>
                                    patchFilters({ status: parseStatusFilter(event.target.value) })
                                }
                                value={filters.status}
                            >
                                <option value="ALL">Semua status</option>
                                {ALL_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="war-select">
                            <span className="sr-only">Urutkan</span>
                            <select
                                onChange={(event) =>
                                    patchFilters({ sort: parseSort(event.target.value) })
                                }
                                value={filters.sort}
                            >
                                {SORT_OPTIONS.map((sort) => (
                                    <option key={sort} value={sort}>
                                        {SORT_LABELS[sort]}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label
                            className={
                                filters.ghostingOnly ? "war-toggle war-toggle-on" : "war-toggle"
                            }
                        >
                            <input
                                checked={filters.ghostingOnly}
                                onChange={(event) =>
                                    patchFilters({ ghostingOnly: event.target.checked })
                                }
                                type="checkbox"
                            />
                            <span>Hanya Rawan Ghosting ({ghostingCount})</span>
                        </label>
                    </div>

                    <p className="war-count" role="status">
                        Menampilkan {visible.length} dari {applications.length} lamaran
                    </p>

                    {visible.length === 0 ? (
                        <div className="empty-state compact-empty">
                            <span className="empty-icon">⌕</span>
                            <h3>Tidak ada lamaran yang cocok</h3>
                            <p>Coba ubah kata kunci atau filter yang sedang aktif.</p>
                            {filtersActive && (
                                <button
                                    className="button button-secondary"
                                    onClick={() => patchFilters({ query: "", status: "ALL", ghostingOnly: false })}
                                    type="button"
                                >
                                    Reset filter
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="application-list">
                            {visible.map((application) => {
                                const progress = getChecklistProgress(application)
                                const match = calculateSkillMatch(application.requiredSkills, kaptenSkills)
                                const canSimulate =
                                    application.status === "APPLIED" ||
                                    application.status === "SCREENING"
                                return (
                                    <article className="application-card" key={application.id}>
                                        <div className="application-card-main">
                                            <div className="application-title-row">
                                                <div>
                                                    <h3>{application.role}</h3>
                                                    <p>{application.company}</p>
                                                </div>
                                                <div className="war-badges">
                                                    {isGhostingRisk(application) && (
                                                        <span className="war-ghost">Rawan Ghosting</span>
                                                    )}
                                                    <span className={`status-pill status-${application.status.toLowerCase()}`}>
                                                        {application.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="application-meta">
                                                <span>{application.workMode}</span>
                                                <span>CV: {application.cvVersion ?? "belum diisi"}</span>
                                                <span className={`war-match war-match-${getMatchTone(match.score)}`}>
                                                    Match {match.score}%
                                                </span>
                                                {application.status === "INTERVIEW" &&
                                                    application.interviewDateTime && (
                                                        <span>
                                                            Interview {formatDateTime(application.interviewDateTime)}
                                                        </span>
                                                    )}
                                            </div>
                                            <div className="war-progress-row">
                                                <div
                                                    aria-label={`Progress checklist ${application.company}`}
                                                    aria-valuemax={100}
                                                    aria-valuemin={0}
                                                    aria-valuenow={progress.percent}
                                                    className="war-progress"
                                                    role="progressbar"
                                                >
                                                    <span style={{ width: `${progress.percent}%` }} />
                                                </div>
                                                <small>
                                                    {progress.done}/{progress.total} checklist
                                                </small>
                                            </div>
                                        </div>
                                        <div className="war-actions">
                                            <button
                                                aria-label={`Lihat detail ${application.role} di ${application.company}`}
                                                className="button button-secondary button-small"
                                                onClick={() => onOpen(application.id)}
                                                type="button"
                                            >
                                                Detail
                                            </button>
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
                                                aria-label={`Hapus lamaran ${application.role} di ${application.company}`}
                                                className="button button-quiet button-danger button-small"
                                                onClick={() => onDelete(application.id)}
                                                type="button"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
