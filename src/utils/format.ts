/** "2026-11-22T10:00" menjadi mis. "22 Nov, 10.00" (format Indonesia). */
export function formatDateTime(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    })
}
