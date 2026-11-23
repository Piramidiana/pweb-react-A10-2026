import { useRef, useState, type FormEvent } from "react"
import type { Application, ApplicationStatus, WorkMode } from "../types"
import { isDuplicateApplication, parseSkillList } from "../utils"

type InitialStatus = Extract<ApplicationStatus, "WISHLIST" | "APPLIED">
type FormField = "company" | "role" | "cvVersion" | "appliedDate"
type FormErrors = Partial<Record<FormField, string>>

type ManualApplicationFormProps = {
    applications: Application[]
    onSubmit: (details: {
        company: string
        role: string
        workMode: WorkMode
        status: InitialStatus
        requiredSkills: string[]
        cvVersion?: string
        appliedDate?: string
    }) => boolean
}

export function ManualApplicationForm({
    applications,
    onSubmit,
}: ManualApplicationFormProps) {
    const [company, setCompany] = useState("")
    const [role, setRole] = useState("")
    const [workMode, setWorkMode] = useState<WorkMode>("Remote")
    const [status, setStatus] = useState<InitialStatus>("WISHLIST")
    const [skillsText, setSkillsText] = useState("")
    const [cvVersion, setCvVersion] = useState("")
    const [appliedDate, setAppliedDate] = useState("")
    const [errors, setErrors] = useState<FormErrors>({})
    const [submitError, setSubmitError] = useState("")
    const companyRef = useRef<HTMLInputElement>(null)
    const roleRef = useRef<HTMLInputElement>(null)
    const cvVersionRef = useRef<HTMLInputElement>(null)
    const appliedDateRef = useRef<HTMLInputElement>(null)
    const fieldRefs: Record<FormField, { current: HTMLInputElement | null }> = {
        company: companyRef,
        role: roleRef,
        cvVersion: cvVersionRef,
        appliedDate: appliedDateRef,
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const nextErrors: FormErrors = {}
        const normalizedCompany = company.trim()
        const normalizedRole = role.trim()

        if (!normalizedCompany) nextErrors.company = "Nama perusahaan wajib diisi."
        if (!normalizedRole) nextErrors.role = "Posisi wajib diisi."
        if (
            normalizedCompany &&
            normalizedRole &&
            isDuplicateApplication(applications, normalizedCompany, normalizedRole)
        ) {
            nextErrors.company = "Lamaran dengan perusahaan dan posisi ini sudah ada."
            nextErrors.role = "Periksa kembali perusahaan dan posisi yang dimasukkan."
        }
        if (status === "APPLIED") {
            if (!cvVersion.trim()) {
                nextErrors.cvVersion = "Versi CV wajib diisi untuk status APPLIED."
            }
            if (!appliedDate) {
                nextErrors.appliedDate = "Tanggal lamaran wajib diisi untuk status APPLIED."
            }
        }

        setErrors(nextErrors)
        setSubmitError("")
        const firstInvalid = (
            ["company", "role", "cvVersion", "appliedDate"] as FormField[]
        ).find((field) => nextErrors[field])
        if (firstInvalid) {
            fieldRefs[firstInvalid].current?.focus()
            return
        }

        const created = onSubmit({
            company: normalizedCompany,
            role: normalizedRole,
            workMode,
            status,
            requiredSkills: parseSkillList(skillsText),
            ...(status === "APPLIED"
                ? { cvVersion: cvVersion.trim(), appliedDate }
                : {}),
        })
        if (!created) {
            setSubmitError("Lamaran dengan perusahaan dan posisi ini sudah ada.")
            companyRef.current?.focus()
            return
        }

        setCompany("")
        setRole("")
        setWorkMode("Remote")
        setStatus("WISHLIST")
        setSkillsText("")
        setCvVersion("")
        setAppliedDate("")
        setErrors({})
    }

    return (
        <div className="manual-form-wrap">
            <div className="section-heading">
                <div>
                    <p className="eyebrow">CATAT PELUANG BARU</p>
                    <h2>Tambah lamaran manual</h2>
                    <p className="section-description">
                        Simpan peluang yang kamu temukan di luar daftar lowongan.
                    </p>
                </div>
                <span className="form-step">FORM 02</span>
            </div>

            <form className="manual-form" onSubmit={handleSubmit} noValidate>
                <div className="form-grid">
                    <label className="form-field">
                        <span>Nama perusahaan <b>*</b></span>
                        <input
                            aria-invalid={Boolean(errors.company)}
                            aria-describedby={errors.company ? "company-error" : undefined}
                            onChange={(event) => {
                                setCompany(event.target.value)
                                setErrors((current) => ({ ...current, company: undefined }))
                                setSubmitError("")
                            }}
                            placeholder="Contoh: Nusantara Cloud"
                            ref={companyRef}
                            value={company}
                        />
                        {errors.company && <small id="company-error" className="field-error">{errors.company}</small>}
                    </label>

                    <label className="form-field">
                        <span>Posisi / role <b>*</b></span>
                        <input
                            aria-invalid={Boolean(errors.role)}
                            aria-describedby={errors.role ? "role-error" : undefined}
                            onChange={(event) => {
                                setRole(event.target.value)
                                setErrors((current) => ({ ...current, role: undefined }))
                                setSubmitError("")
                            }}
                            placeholder="Contoh: Frontend Developer Intern"
                            ref={roleRef}
                            value={role}
                        />
                        {errors.role && <small id="role-error" className="field-error">{errors.role}</small>}
                    </label>

                    <label className="form-field">
                        <span>Mode kerja</span>
                        <select
                            onChange={(event) => setWorkMode(event.target.value as WorkMode)}
                            value={workMode}
                        >
                            <option value="Remote">Remote</option>
                            <option value="Hybrid">Hybrid</option>
                            <option value="Onsite">Onsite</option>
                        </select>
                    </label>

                    <label className="form-field">
                        <span>Status awal</span>
                        <select
                            onChange={(event) => {
                                setStatus(event.target.value as InitialStatus)
                                setErrors({})
                            }}
                            value={status}
                        >
                            <option value="WISHLIST">WISHLIST</option>
                            <option value="APPLIED">APPLIED</option>
                        </select>
                    </label>

                    <label className="form-field form-field-wide">
                        <span>Skill yang dibutuhkan</span>
                        <input
                            onChange={(event) => setSkillsText(event.target.value)}
                            placeholder="Pisahkan dengan koma, mis. React, TypeScript, CSS"
                            value={skillsText}
                        />
                        <small className="field-hint">Skill dipisahkan dengan koma.</small>
                    </label>

                    {status === "APPLIED" && (
                        <>
                            <label className="form-field">
                                <span>Versi CV <b>*</b></span>
                                <input
                                    aria-invalid={Boolean(errors.cvVersion)}
                                    aria-describedby={errors.cvVersion ? "cv-error" : undefined}
                                    onChange={(event) => {
                                        setCvVersion(event.target.value)
                                        setErrors((current) => ({ ...current, cvVersion: undefined }))
                                    }}
                                    placeholder="Contoh: CV Frontend v2"
                                    ref={cvVersionRef}
                                    value={cvVersion}
                                />
                                {errors.cvVersion && <small id="cv-error" className="field-error">{errors.cvVersion}</small>}
                            </label>
                            <label className="form-field">
                                <span>Tanggal melamar <b>*</b></span>
                                <input
                                    aria-invalid={Boolean(errors.appliedDate)}
                                    aria-describedby={errors.appliedDate ? "date-error" : undefined}
                                    onChange={(event) => {
                                        setAppliedDate(event.target.value)
                                        setErrors((current) => ({ ...current, appliedDate: undefined }))
                                    }}
                                    ref={appliedDateRef}
                                    type="date"
                                    value={appliedDate}
                                />
                                {errors.appliedDate && <small id="date-error" className="field-error">{errors.appliedDate}</small>}
                            </label>
                        </>
                    )}
                </div>

                {submitError && <p className="form-alert" role="alert">{submitError}</p>}
                <div className="form-actions">
                    <p className="field-hint">Kolom bertanda * wajib diisi.</p>
                    <button className="button button-primary" type="submit">
                        Simpan lamaran
                    </button>
                </div>
            </form>
        </div>
    )
}
