import { useState, type FormEvent } from "react"
import { hasSkill } from "../utils"

type SkillProfileProps = {
    skills: string[]
    onAddSkill: (skill: string) => boolean
    onRemoveSkill: (skill: string) => void
}

export function SkillProfile({
    skills,
    onAddSkill,
    onRemoveSkill,
}: SkillProfileProps) {
    const [skillInput, setSkillInput] = useState("")
    const [error, setError] = useState("")

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const skill = skillInput.trim()
        if (!skill) {
            setError("Masukkan nama skill terlebih dahulu.")
            return
        }
        if (hasSkill(skills, skill) || !onAddSkill(skill)) {
            setError("Skill tersebut sudah ada di profil.")
            return
        }
        setSkillInput("")
        setError("")
    }

    return (
        <section className="skill-panel">
            <div className="panel-heading">
                <span className="panel-icon">01</span>
                <div>
                    <p className="eyebrow">PROFIL KAPTEN</p>
                    <h2>Skill saya</h2>
                </div>
            </div>
            <p className="muted-copy">
                Cocokkan kemampuanmu dengan skill yang diminta perusahaan.
            </p>

            <div className="skill-list" aria-label="Skill yang dimiliki">
                {skills.map((skill) => (
                    <span className="skill-chip" key={skill}>
                        {skill}
                        <button
                            aria-label={`Hapus skill ${skill}`}
                            onClick={() => onRemoveSkill(skill)}
                            type="button"
                        >
                            ×
                        </button>
                    </span>
                ))}
                {skills.length === 0 && (
                    <span className="muted-copy">Belum ada skill. Tambahkan di bawah.</span>
                )}
            </div>

            <form className="inline-form" onSubmit={handleSubmit}>
                <label className="sr-only" htmlFor="new-skill">
                    Tambah skill
                </label>
                <input
                    id="new-skill"
                    onChange={(event) => {
                        setSkillInput(event.target.value)
                        setError("")
                    }}
                    placeholder="Contoh: Docker"
                    value={skillInput}
                />
                <button aria-label="Tambah skill" className="button button-icon" type="submit">
                    +
                </button>
            </form>
            {error && <p className="field-error" role="alert">{error}</p>}
            <p className="storage-note">
                <span aria-hidden="true">●</span> Tersimpan otomatis
            </p>
        </section>
    )
}
