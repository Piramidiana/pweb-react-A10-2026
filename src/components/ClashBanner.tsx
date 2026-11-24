import type { Application } from "../types"
import { findInterviewClashes, formatDateTime } from "../utils"
import "./war.css"

type ClashBannerProps = {
    /** Wajib SELURUH lamaran, bukan hasil filter War Room. */
    applications: Application[]
}

function when(application: Application): string {
    return application.interviewDateTime
        ? formatDateTime(application.interviewDateTime)
        : "-"
}

/**
 * Banner bentrok jadwal interview. Dihitung langsung dari seluruh data
 * (derived state), jadi tetap tampil walau filter di War Room sedang aktif
 * dan di tab mana pun.
 */
export function ClashBanner({ applications }: ClashBannerProps) {
    const clashes = findInterviewClashes(applications)
    if (clashes.length === 0) return null

    return (
        <div className="clash-banner" role="alert">
            <strong>Jadwal interview bentrok</strong>
            <ul>
                {clashes.map((clash) => (
                    <li key={`${clash.first.id}-${clash.second.id}`}>
                        {clash.first.company} ({when(clash.first)}) dan{" "}
                        {clash.second.company} ({when(clash.second)}) berselisih{" "}
                        {Math.round(clash.minutesApart)} menit, kurang dari 60 menit.
                    </li>
                ))}
            </ul>
        </div>
    )
}
