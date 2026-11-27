import { useEffect } from "react"
import { useLocalStorage } from "./useLocalStorage"

export type Theme = "light" | "dark"

export function useTheme(): [Theme, () => void] {
    const [theme, setTheme] = useLocalStorage<Theme>(
        "aku-mw-magang:theme",
        "light",
    )

    useEffect(() => {
        document.documentElement.dataset.theme = theme
    }, [theme])

    function toggleTheme() {
        setTheme((current) => (current === "light" ? "dark" : "light"))
    }

    return [theme, toggleTheme]
}
