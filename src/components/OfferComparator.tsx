import { useState } from "react"
import type { Application, OfferScore } from "../types"
import { calculateSkillMatch, compareOffers, WORK_MODE_SCORE } from "../utils"
import "./dashboard.css"

// Bobot sesuai soal: gaji 50%, mode kerja 25%, skill match 25%.
// Dipakai hanya untuk menampilkan poin per baris (mis. 37.5 / 50).
// Total skor tetap dihitung oleh scoreOffer() di utils/offerScore.ts.
const WEIGHT_SALARY = 0.5
const WEIGHT_WORK_MODE = 0.25
const WEIGHT_SKILL = 0.25

function formatRupiah(value: number): string {
    return `Rp ${new Intl.NumberFormat("id-ID").format(value)}`
}

function formatPoints(score: number, weight: number): string {
    return `${(score * weight).toFixed(1)} / ${weight * 100}`
}

type OfferCardProps = {
    application: Application
    score: OfferScore
    ownedSkills: string[]
    isBest: boolean
}

function OfferCard({ application, score, ownedSkills, isBest }: OfferCardProps) {
    const match = calculateSkillMatch(application.requiredSkills, ownedSkills)

    return (
        <article className={isBest ? "offer-card offer-card-best" : "offer-card"}>
            <header className="offer-card-header">
                <div>
                    <h3>{application.company}</h3>
                    <p>{application.role}</p>
                </div>
                {isBest && <span className="offer-badge">Rekomendasi Terbaik</span>}
            </header>

            <dl className="offer-rows">
                <div className="offer-row">
                    <dt>Uang Saku / Bulan</dt>
                    <dd>{formatRupiah(application.salaryOffer ?? 0)}</dd>
                    <dd>{formatPoints(score.salaryScore, WEIGHT_SALARY)}</dd>
                </div>
                <div className="offer-row">
                    <dt>Mode Kerja</dt>
                    <dd>
                        {application.workMode} ({WORK_MODE_SCORE[application.workMode]})
                    </dd>
                    <dd>{formatPoints(score.workModeScore, WEIGHT_WORK_MODE)}</dd>
                </div>
                <div className="offer-row">
                    <dt>Kecocokan Skill</dt>
                    <dd>
                        {score.skillScore}% ({match.matched.length} dari{" "}
                        {application.requiredSkills.length} skill)
                    </dd>
                    <dd>{formatPoints(score.skillScore, WEIGHT_SKILL)}</dd>
                </div>
            </dl>

            <footer className="offer-total">
                <span>Total Skor Berbobot</span>
                <strong>{score.total.toFixed(1)}</strong>
            </footer>
        </article>
    )
}

function OfferEmpty() {
    return (
        <p className="offer-empty">
            Offer Comparator butuh minimal 2 lamaran berstatus OFFER. Pindahkan
            lamaran ke status OFFER dari halaman detail untuk mulai membandingkan.
        </p>
    )
}

type OfferComparatorProps = {
    applications: Application[]
    kaptenSkills: string[]
}

export function OfferComparator({
    applications,
    kaptenSkills,
}: OfferComparatorProps) {
    // Yang disimpan hanya id pilihan. Datanya selalu diambil dari `applications`
    // supaya tidak basi kalau lamaran berubah atau dihapus.
    const [offerAId, setOfferAId] = useState("")
    const [offerBId, setOfferBId] = useState("")

    const offers = applications.filter((item) => item.status === "OFFER")

    // Hook di atas harus dipanggil sebelum return awal ini.
    if (offers.length < 2) {
        return (
            <section className="offer-comparator">
                <h2>Bandingkan Offer Magang</h2>
                <OfferEmpty />
            </section>
        )
    }

    // Pilihan belum dibuat atau sudah tidak valid: pakai offer pertama yang ada.
    const offerA = offers.find((item) => item.id === offerAId) ?? offers[0]
    const offerB =
        offers.find((item) => item.id === offerBId && item.id !== offerA.id) ??
        offers.find((item) => item.id !== offerA.id)

    if (!offerB) {
        return (
            <section className="offer-comparator">
                <h2>Bandingkan Offer Magang</h2>
                <OfferEmpty />
            </section>
        )
    }

    const comparison = compareOffers(offerA, offerB, kaptenSkills)

    return (
        <section className="offer-comparator">
            <header className="offer-comparator-header">
                <div>
                    <h2>Bandingkan Offer Magang</h2>
                    <p>Bobot penilaian: uang saku 50%, mode kerja 25%, kecocokan skill 25%.</p>
                </div>
                <div className="offer-pickers">
                    <label>
                        Offer A
                        <select
                            value={offerA.id}
                            onChange={(event) => setOfferAId(event.target.value)}
                        >
                            {offers
                                .filter((item) => item.id !== offerB.id)
                                .map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.company}
                                    </option>
                                ))}
                        </select>
                    </label>
                    <label>
                        Offer B
                        <select
                            value={offerB.id}
                            onChange={(event) => setOfferBId(event.target.value)}
                        >
                            {offers
                                .filter((item) => item.id !== offerA.id)
                                .map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.company}
                                    </option>
                                ))}
                        </select>
                    </label>
                </div>
            </header>

            <div className="offer-cards">
                <OfferCard
                    application={offerA}
                    score={comparison.a}
                    ownedSkills={kaptenSkills}
                    isBest={comparison.winner === "a"}
                />
                <OfferCard
                    application={offerB}
                    score={comparison.b}
                    ownedSkills={kaptenSkills}
                    isBest={comparison.winner === "b"}
                />
            </div>

            {comparison.winner === "tie" && (
                <p className="offer-tie">Skor kedua offer sama, belum ada rekomendasi terbaik.</p>
            )}
        </section>
    )
}
