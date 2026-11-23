import type { Application } from "../types"
import { calculateStats } from "../utils"
import "./dashboard.css"

type StatsCardsProps = {
    applications: Application[]
}

/**
 * 5 kartu statistik dashboard.
 * Tidak ada useState di sini: semua angka dihitung ulang dari `applications`
 * setiap render (derived state), jadi otomatis ikut berubah saat data berubah.
 */
export function StatsCards({ applications }: StatsCardsProps) {
    const stats = calculateStats(applications)

    const cards: { label: string; value: string }[] = [
        { label: "Total Lamaran", value: String(stats.total) },
        { label: "Response Rate", value: `${stats.responseRate}%` },
        { label: "Interview Rate", value: `${stats.interviewRate}%` },
        { label: "Rawan Ghosting", value: String(stats.ghostingRisk) },
        { label: "Offer Diterima", value: String(stats.totalOffer) },
    ]

    return (
        <section className="stats-grid" aria-label="Statistik lamaran">
            {cards.map((card) => (
                <div className="stat-card" key={card.label}>
                    <span className="stat-label">{card.label}</span>
                    <strong className="stat-value">{card.value}</strong>
                </div>
            ))}
        </section>
    )
}
