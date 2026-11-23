import { useEffect, useState } from "react"

const PREP_QUESTIONS = [
    "Ceritakan tentang dirimu dan hal yang membuatmu tertarik pada posisi ini.",
    "Proyek apa yang paling kamu banggakan, dan apa kontribusimu di dalamnya?",
    "Bagaimana caramu menghadapi bug atau masalah teknis yang belum pernah ditemui?",
    "Ceritakan pengalaman bekerja dalam tim dan menyelesaikan perbedaan pendapat.",
    "Apa yang ingin kamu pelajari selama menjalani program magang ini?",
]

const START_SECONDS = 2 * 60

function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainder = seconds % 60
    return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
}

export function InterviewPrepTimer() {
    const [questionIndex, setQuestionIndex] = useState(0)
    const [timer, setTimer] = useState({
        secondsLeft: START_SECONDS,
        isRunning: false,
    })

    useEffect(() => {
        if (!timer.isRunning) return

        const intervalId = window.setInterval(() => {
            setTimer((current) => {
                if (current.secondsLeft <= 1) {
                    return { secondsLeft: 0, isRunning: false }
                }
                return {
                    ...current,
                    secondsLeft: current.secondsLeft - 1,
                }
            })
        }, 1000)

        return () => window.clearInterval(intervalId)
    }, [timer.isRunning])

    function resetTimer() {
        setTimer({ secondsLeft: START_SECONDS, isRunning: false })
    }

    function nextQuestion() {
        setQuestionIndex((current) => (current + 1) % PREP_QUESTIONS.length)
        setTimer({ secondsLeft: START_SECONDS, isRunning: false })
    }

    return (
        <section className="timer-panel" aria-label="Latihan interview">
            <div className="timer-content">
                <div>
                    <p className="eyebrow">LATIHAN INTERVIEW · SOAL {questionIndex + 1}/5</p>
                    <p className="timer-question">{PREP_QUESTIONS[questionIndex]}</p>
                </div>
                <div
                    className={timer.secondsLeft === 0 ? "timer-display timer-finished" : "timer-display"}
                    role="timer"
                >
                    {formatTime(timer.secondsLeft)}
                </div>
            </div>
            <div className="timer-actions">
                <button
                    className="button button-primary button-small"
                    disabled={timer.secondsLeft === 0}
                    onClick={() =>
                        setTimer((current) => ({
                            ...current,
                            isRunning: !current.isRunning,
                        }))
                    }
                    type="button"
                >
                    {timer.isRunning ? "Jeda" : "Mulai"}
                </button>
                <button
                    className="button button-quiet button-small"
                    onClick={resetTimer}
                    type="button"
                >
                    Reset
                </button>
                <button
                    className="button button-quiet button-small"
                    onClick={nextQuestion}
                    type="button"
                >
                    Soal berikutnya
                </button>
            </div>
        </section>
    )
}

export function InterviewPrepPanel() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="prep-panel-wrap">
            <button
                aria-expanded={isOpen}
                className="prep-toggle"
                onClick={() => setIsOpen((open) => !open)}
                type="button"
            >
                {isOpen ? "Tutup latihan interview" : "Buka latihan interview"}
                <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && <InterviewPrepTimer />}
        </div>
    )
}
