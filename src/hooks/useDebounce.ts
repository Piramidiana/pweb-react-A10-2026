import { useEffect, useState } from "react"

/** Mengembalikan `value` setelah tidak berubah selama `delay` ms (default 400). */
export function useDebounce<T>(value: T, delay: number = 400): T {
    const [debounced, setDebounced] = useState<T>(value)

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])

    return debounced
}
