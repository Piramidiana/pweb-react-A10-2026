import { useEffect, useRef, useState } from "react"
import type { Application, JobListing, WorkMode } from "./types"
import { useLocalStorage } from "./hooks"
import {
    hasSkill,
    isDuplicateApplication,
} from "./utils"
import { JobExplorer } from "./components/JobExplorer"
import { ManualApplicationForm } from "./components/ManualApplicationForm"
import { SkillProfile } from "./components/SkillProfile"
import { InterviewPrepPanel } from "./components/InterviewPrepTimer"
import { StatsCards } from "./components/StatsCards"
import { OfferComparator } from "./components/OfferComparator"

type View = "explore" | "manual" | "applications" | "offers"

type PendingDelete = {
    application: Application
    index: number
}

function getWorkMode(location: string): WorkMode {
    const normalized = location.toLowerCase()
    if (normalized.includes("hybrid")) return "Hybrid"
    if (normalized.includes("onsite") || normalized.includes("on-site")) {
        return "Onsite"
    }
    return "Remote"
}

function createApplication(
    details: Omit<Application, "id" | "lastUpdatedAt" | "checklist" | "activityLogs">,
): Application {
    const now = new Date().toISOString()
    return {
        ...details,
        id: crypto.randomUUID(),
        lastUpdatedAt: now,
        checklist: [],
        activityLogs: [
            {
                id: crypto.randomUUID(),
                timestamp: now,
                message: "Lamaran ditambahkan",
            },
        ],
    }
}

function App() {
    const [applications, setApplications] = useLocalStorage<Application[]>(
        "aku-mw-magang:applications",
        [],
    )
    const [kaptenSkills, setKaptenSkills] = useLocalStorage<string[]>(
        "aku-mw-magang:kaptenSkills",
        ["React", "TypeScript", "CSS"],
    )
    const [view, setView] = useState<View>("explore")
    const [pendingDeletes, setPendingDeletes] = useState<PendingDelete[]>([])
    const pendingDeletesRef = useRef<PendingDelete[]>([])
    const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(
        () => () => {
            if (deleteTimeoutRef.current !== null) {
                clearTimeout(deleteTimeoutRef.current)
            }
        },
        [],
    )

    function saveJob(job: JobListing) {
        if (
            isDuplicateApplication(
                applications,
                job.company_name,
                job.title,
            )
        ) {
            return
        }

        const application = createApplication({
            company: job.company_name,
            role: job.title,
            workMode: getWorkMode(job.candidate_required_location),
            status: "WISHLIST",
            requiredSkills: job.tags,
        })
        setApplications((current) => [application, ...current])
    }

    function addManualApplication(details: {
        company: string
        role: string
        workMode: WorkMode
        status: "WISHLIST" | "APPLIED"
        requiredSkills: string[]
        cvVersion?: string
        appliedDate?: string
    }) {
        if (
            isDuplicateApplication(
                applications,
                details.company,
                details.role,
            )
        ) {
            return false
        }

        const application = createApplication(details)
        setApplications((current) => [application, ...current])
        setView("applications")
        return true
    }

    function addSkill(input: string): boolean {
        const skill = input.trim()
        if (!skill || hasSkill(kaptenSkills, skill)) return false
        setKaptenSkills((current) => [...current, skill])
        return true
    }

    function removeSkill(skillToRemove: string) {
        setKaptenSkills((current) =>
            current.filter((skill) => skill !== skillToRemove),
        )
    }

    function deleteApplication(id: string) {
        const index = applications.findIndex((item) => item.id === id)
        const application = applications[index]
        if (!application) return

        const nextPending = [
            ...pendingDeletesRef.current,
            { application, index },
        ].sort((a, b) => a.index - b.index)
        pendingDeletesRef.current = nextPending
        setPendingDeletes(nextPending)
        setApplications((current) =>
            current.filter((item) => item.id !== application.id),
        )

        if (deleteTimeoutRef.current !== null) {
            clearTimeout(deleteTimeoutRef.current)
        }
        deleteTimeoutRef.current = setTimeout(() => {
            pendingDeletesRef.current = []
            setPendingDeletes([])
            deleteTimeoutRef.current = null
        }, 5000)
    }

    function undoDelete() {
        if (deleteTimeoutRef.current !== null) {
            clearTimeout(deleteTimeoutRef.current)
            deleteTimeoutRef.current = null
        }
        const removed = pendingDeletesRef.current
        pendingDeletesRef.current = []
        setPendingDeletes([])
        setApplications((current) => {
            const restored = [...current]
            for (const item of removed) {
                if (restored.some((application) => application.id === item.application.id)) {
                    continue
                }
                restored.splice(
                    Math.min(item.index, restored.length),
                    0,
                    item.application,
                )
            }
            return restored
        })
    }

    const offerCount = applications.filter((item) => item.status === "OFFER").length

    const navItems: { id: View; label: string }[] = [
        { id: "explore", label: "Eksplorasi lowongan" },
        { id: "manual", label: "Tambah lamaran" },
        { id: "applications", label: `Lamaran saya (${applications.length})` },
        { id: "offers", label: `Bandingkan offer (${offerCount})` },
    ]

    return (
        <main className="app-shell">
            <header className="topbar">
                <a className="brand" href="#" onClick={() => setView("explore")}>
                    <span className="brand-mark">M</span>
                    <span>Aku Mw Magang</span>
                </a>
                <span className="topbar-note">Ruang kendali pencarian magang</span>
            </header>

            <section className="hero">
                <div className="hero-copy">
                    <p className="eyebrow">LANGKAH KECIL, KARIER BESAR</p>
                    <h1>Magang impianmu, lebih terarah.</h1>
                    <p>
                        Temukan peluang yang cocok, kelola setiap lamaran, dan
                        bersiap untuk interview berikutnya.
                    </p>
                </div>
                <div className="hero-stat" aria-label="Jumlah lamaran tersimpan">
                    <span className="hero-stat-number">{applications.length}</span>
                    <span>lamaran tersimpan</span>
                </div>
            </section>

            <nav className="main-nav" aria-label="Navigasi utama">
                {navItems.map((item) => (
                    <button
                        className={view === item.id ? "nav-button active" : "nav-button"}
                        key={item.id}
                        onClick={() => setView(item.id)}
                        type="button"
                    >
                        {item.label}
                    </button>
                ))}
            </nav>

            <StatsCards applications={applications} />

            {view === "explore" && (
                <div className="page-grid">
                    <aside className="sidebar">
                        <SkillProfile
                            skills={kaptenSkills}
                            onAddSkill={addSkill}
                            onRemoveSkill={removeSkill}
                        />
                    </aside>
                    <section className="content-panel">
                        <JobExplorer
                            applications={applications}
                            kaptenSkills={kaptenSkills}
                            onSaveJob={saveJob}
                        />
                    </section>
                </div>
            )}

            {view === "manual" && (
                <section className="content-panel standalone-panel">
                    <ManualApplicationForm
                        applications={applications}
                        onSubmit={addManualApplication}
                    />
                </section>
            )}

            {view === "applications" && (
                <section className="content-panel standalone-panel">
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">RUANG KENDALI</p>
                            <h2>Lamaran tersimpan</h2>
                            <p className="section-description">
                                Data tersimpan otomatis di browser ini.
                            </p>
                        </div>
                        <button
                            className="button button-primary"
                            onClick={() => setView("manual")}
                            type="button"
                        >
                            + Tambah lamaran
                        </button>
                    </div>

                    {applications.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon">+</span>
                            <h3>Belum ada lamaran</h3>
                            <p>Simpan lowongan atau tambahkan lamaran secara manual.</p>
                            <button
                                className="button button-secondary"
                                onClick={() => setView("explore")}
                                type="button"
                            >
                                Jelajahi lowongan
                            </button>
                        </div>
                    ) : (
                        <div className="application-list">
                            {applications.map((application) => (
                                <article className="application-card" key={application.id}>
                                    <div className="application-card-main">
                                        <div className="application-title-row">
                                            <div>
                                                <h3>{application.role}</h3>
                                                <p>{application.company}</p>
                                            </div>
                                            <span className={`status-pill status-${application.status.toLowerCase()}`}>
                                                {application.status}
                                            </span>
                                        </div>
                                        <div className="application-meta">
                                            <span>{application.workMode}</span>
                                            {application.cvVersion && (
                                                <span>CV: {application.cvVersion}</span>
                                            )}
                                            <span>{application.requiredSkills.length} skill</span>
                                        </div>
                                        {application.status === "INTERVIEW" && (
                                            <InterviewPrepPanel />
                                        )}
                                    </div>
                                    <button
                                        aria-label={`Hapus lamaran ${application.role} di ${application.company}`}
                                        className="button button-quiet button-danger"
                                        onClick={() => deleteApplication(application.id)}
                                        type="button"
                                    >
                                        Hapus
                                    </button>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            )}
            
            {view === "offers" && (
                <section className="content-panel standalone-panel">
                    <OfferComparator
                        applications={applications}
                        kaptenSkills={kaptenSkills}
                    />
                </section>
            )}

            {pendingDeletes.length > 0 && (
                <div className="undo-toast" role="status">
                    <span>
                        {pendingDeletes.length === 1
                            ? "Lamaran dihapus"
                            : `${pendingDeletes.length} lamaran dihapus`}
                    </span>
                    <button onClick={undoDelete} type="button">
                        Urungkan
                    </button>
                </div>
            )}

            <footer className="app-footer">
                Dibuat untuk membantu setiap langkah pencarian magangmu.
            </footer>
        </main>
    )
}

export default App
