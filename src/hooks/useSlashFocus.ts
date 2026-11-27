import { useEffect, type RefObject } from "react"

function isTyping(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    return (
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
    )
}

export function useSlashFocus(inputRef: RefObject<HTMLInputElement | null>) {
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key !== "/") return
            if (event.ctrlKey || event.metaKey || event.altKey) return
            if (isTyping(event.target)) return
            event.preventDefault()
            inputRef.current?.focus()
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [inputRef])
}
