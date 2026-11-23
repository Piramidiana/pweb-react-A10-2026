import { useEffect, useMemo, useState } from "react"
import type { Application, JobListing, SkillMatch } from "../types"
import { useDebounce } from "../hooks"
import { fetchJobs, type JobSource } from "../services"
import {
    calculateSkillMatch,
    getMatchTone,
    isDuplicateApplication,
} from "../utils"

type JobExplorerProps = {
    applications: Application[]
    kaptenSkills: string[]
    onSaveJob: (job: JobListing) => void
}

function matchFor(job: JobListing, skills: string[]): SkillMatch {
    return calculateSkillMatch(job.tags, skills)
}

export function JobExplorer({
    applications,
    kaptenSkills,
    onSaveJob,
}: JobExplorerProps) {
    const [source, setSource] = useState<JobSource>("live")
    const [jobs, setJobs] = useState<JobListing[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [retryCount, setRetryCount] = useState(0)
    const [keyword, setKeyword] = useState("")
    const [category, setCategory] = useState("Semua kategori")
    const debouncedKeyword = useDebounce(keyword, 400)

    useEffect(() => {
        const controller = new AbortController()

        fetchJobs(source, controller.signal)
            .then((result) => {
                setJobs(result)
            })
            .catch((reason: unknown) => {
                if (
                    reason instanceof DOMException &&
                    reason.name === "AbortError"
                ) {
                    return
                }
                setJobs([])
                setError(
                    reason instanceof Error
                        ? reason.message
                        : "Terjadi kesalahan saat mengambil lowongan.",
                )
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false)
            })

        return () => controller.abort()
    }, [source, retryCount])

    function retryJobs() {
        setLoading(true)
        setError(null)
        setRetryCount((count) => count + 1)
    }

    function selectSource(nextSource: JobSource) {
        if (nextSource === source) {
            retryJobs()
            return
        }
        setLoading(true)
        setError(null)
        setSource(nextSource)
    }

    const categories = useMemo(
        () => [...new Set(jobs.map((job) => job.category))].sort(),
        [jobs],
    )

    const visibleJobs = useMemo(() => {
        const query = debouncedKeyword.trim().toLocaleLowerCase()
        return jobs
            .filter(
                (job) =>
                    category === "Semua kategori" || job.category === category,
            )
            .filter((job) => {
                if (!query) return true
                const searchable = [
                    job.title,
                    job.company_name,
                    job.category,
                    job.candidate_required_location,
                    ...job.tags,
                ]
                    .join(" ")
                    .toLocaleLowerCase()
                return searchable.includes(query)
            })
            .sort(
                (a, b) =>
                    matchFor(b, kaptenSkills).score -
                    matchFor(a, kaptenSkills).score,
            )
    }, [jobs, category, debouncedKeyword, kaptenSkills])

    function alreadySaved(job: JobListing): boolean {
        return isDuplicateApplication(
            applications,
            job.company_name,
            job.title,
        )
    }

    return (
        <div className="explorer">
            <div className="section-heading explorer-heading">
                <div>
                    <p className="eyebrow">TEMUKAN PELUANG</p>
                    <h2>Eksplorasi lowongan</h2>
                    <p className="section-description">
                        Lowongan diurutkan berdasarkan kecocokan skill terkuat.
                    </p>
                </div>
                <div className="source-switch" aria-label="Sumber lowongan">
                    <button
                        className={source === "live" ? "source-option selected" : "source-option"}
                        onClick={() => selectSource("live")}
                        type="button"
                    >
                        Live API
                    </button>
                    <button
                        className={source === "fallback" ? "source-option selected" : "source-option"}
                        onClick={() => selectSource("fallback")}
                        type="button"
                    >
                        Lokal
                    </button>
                </div>
            </div>

            <div className="filter-row">
                <label className="search-field">
                    <span aria-hidden="true" className="search-icon">⌕</span>
                    <span className="sr-only">Cari lowongan</span>
                    <input
                        onChange={(event) => setKeyword(event.target.value)}
                        placeholder="Cari posisi, perusahaan, atau skill..."
                        value={keyword}
                    />
                </label>
                <label className="select-field">
                    <span className="sr-only">Filter kategori</span>
                    <select
                        onChange={(event) => setCategory(event.target.value)}
                        value={category}
                    >
                        <option>Semua kategori</option>
                        {categories.map((item) => (
                            <option key={item}>{item}</option>
                        ))}
                    </select>
                </label>
            </div>

            {loading && (
                <div className="loading-state" role="status">
                    <span className="loading-spinner" />
                    <span>Memuat lowongan...</span>
                </div>
            )}

            {!loading && error && (
                <div className="error-state" role="alert">
                    <span className="state-symbol">!</span>
                    <div>
                        <h3>Lowongan belum dapat dimuat</h3>
                        <p>{error}</p>
                        <div className="button-row">
                            <button
                                className="button button-secondary"
                                onClick={retryJobs}
                                type="button"
                            >
                                Coba lagi
                            </button>
                            {source !== "fallback" && (
                                <button
                                    className="button button-primary"
                                    onClick={() => selectSource("fallback")}
                                    type="button"
                                >
                                    Gunakan data lokal
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {!loading && !error && visibleJobs.length === 0 && (
                <div className="empty-state compact-empty">
                    <span className="empty-icon">⌕</span>
                    <h3>
                        {jobs.length === 0
                            ? "Belum ada lowongan tersedia"
                            : "Lowongan tidak ditemukan"}
                    </h3>
                    <p>
                        {jobs.length === 0
                            ? "Coba muat ulang atau ganti sumber data."
                            : "Coba kata kunci atau kategori yang berbeda."}
                    </p>
                    {jobs.length === 0 && (
                        <button
                            className="button button-secondary"
                            onClick={retryJobs}
                            type="button"
                        >
                            Muat ulang
                        </button>
                    )}
                </div>
            )}

            {!loading && !error && visibleJobs.length > 0 && (
                <div className="job-list">
                    {visibleJobs.map((job) => {
                        const match = matchFor(job, kaptenSkills)
                        const tone = getMatchTone(match.score)
                        const saved = alreadySaved(job)
                        return (
                            <article className="job-card" key={`${source}-${job.id}`}>
                                <div className="job-card-top">
                                    <div className="company-avatar" aria-hidden="true">
                                        {job.company_name.trim().charAt(0).toUpperCase()}
                                    </div>
                                    <div className="job-title-block">
                                        <h3>{job.title}</h3>
                                        <p>{job.company_name}</p>
                                    </div>
                                    <div className={`match-badge match-${tone}`}>
                                        <strong>{match.score}%</strong>
                                        <span>cocok</span>
                                    </div>
                                </div>
                                <div className="job-details">
                                    <span>{job.category}</span>
                                    <span>{job.candidate_required_location}</span>
                                    {job.salary && <span>{job.salary}</span>}
                                </div>
                                <div className="match-detail">
                                    <div className="match-detail-group">
                                        <span className="detail-label">Skill cocok</span>
                                        <div className="mini-chip-list">
                                            {match.matched.length ? (
                                                match.matched.map((skill) => (
                                                    <span className="mini-chip matched-chip" key={skill}>
                                                        {skill}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="muted-copy">Belum ada</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="match-detail-group">
                                        <span className="detail-label">Perlu dipelajari</span>
                                        <div className="mini-chip-list">
                                            {match.missing.length ? (
                                                match.missing.map((skill) => (
                                                    <span className="mini-chip missing-chip" key={skill}>
                                                        {skill}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="muted-copy">Semua skill cocok</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    className={saved ? "button button-saved" : "button button-primary"}
                                    disabled={saved}
                                    onClick={() => onSaveJob(job)}
                                    type="button"
                                >
                                    {saved ? "Sudah dilamar" : "Simpan ke Wishlist"}
                                </button>
                            </article>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
