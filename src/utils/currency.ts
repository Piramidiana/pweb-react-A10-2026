/**
 * Ambil angka dari input rupiah yang diketik manual.
 * "6.000.000" atau "Rp 6000000" menjadi 6000000.
 * Mengembalikan undefined jika tidak ada angka sama sekali.
 */
export function parseRupiah(input: string): number | undefined {
    const digits = input.replace(/\D/g, "")
    if (!digits) return undefined
    const value = Number(digits)
    return Number.isFinite(value) ? value : undefined
}

export function formatRupiah(value: number): string {
    return `Rp ${new Intl.NumberFormat("id-ID").format(value)}`
}
