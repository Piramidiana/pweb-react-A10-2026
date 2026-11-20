import { useEffect, useState, type Dispatch, type SetStateAction } from "react"

function readStorage<T>(key: string, fallback: T | (() => T)): T {
    try {
        const raw = window.localStorage.getItem(key)
        if (raw !== null) return JSON.parse(raw) as T
    } catch {
        // JSON rusak atau storage diblokir: pakai nilai awal.
    }
    return fallback instanceof Function ? fallback() : fallback
}

/**
 * useState yang otomatis dibaca dari dan ditulis ke localStorage.
 * Dipakai untuk `applications` dan `kaptenSkills` agar data tidak hilang saat refresh.
 */
export function useLocalStorage<T>(
    key: string,
    initialValue: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
    const [value, setValue] = useState<T>(() => readStorage(key, initialValue))

    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(value))
        } catch {
            // Kuota penuh atau storage diblokir: abaikan, state tetap jalan.
        }
    }, [key, value])

    return [value, setValue]
}
