import assert from "node:assert/strict"
import { test } from "node:test"
import type { Application } from "../src/types"
import {
    addChecklistItem,
    addNote,
    applyTransition,
    getChecklistProgress,
    isGhostingRisk,
    parseRupiah,
    removeChecklistItem,
    shiftLastUpdated,
    toggleChecklistItem,
} from "../src/utils"

const NOW = "2026-11-23T10:00:00.000Z"

function make(overrides: Partial<Application> = {}): Application {
    return {
        id: "1",
        company: "Garuda FinTech",
        role: "Full-Stack Intern",
        workMode: "Remote",
        status: "WISHLIST",
        requiredSkills: ["React"],
        lastUpdatedAt: "2026-11-01T00:00:00.000Z",
        checklist: [],
        activityLogs: [],
        ...overrides,
    }
}

test("WISHLIST tidak bisa langsung ke OFFER", () => {
    const result = applyTransition(make(), "OFFER", { salaryOffer: 5_000_000 }, NOW)
    assert.equal(result.ok, false)
})

test("ke APPLIED wajib cvVersion dan appliedDate", () => {
    const missing = applyTransition(make(), "APPLIED", {}, NOW)
    assert.equal(missing.ok, false)
    if (!missing.ok) {
        assert.ok(missing.errors.cvVersion)
        assert.ok(missing.errors.appliedDate)
    }

    const ok = applyTransition(
        make(),
        "APPLIED",
        { cvVersion: " CV-v2 ", appliedDate: "2026-11-10" },
        NOW,
    )
    assert.equal(ok.ok, true)
    if (ok.ok) {
        assert.equal(ok.application.status, "APPLIED")
        assert.equal(ok.application.cvVersion, "CV-v2")
        assert.equal(ok.application.appliedDate, "2026-11-10")
        assert.equal(ok.application.lastUpdatedAt, NOW)
        assert.equal(ok.application.activityLogs.length, 1)
        assert.match(ok.application.activityLogs[0].message, /WISHLIST → APPLIED/)
    }
})

test("transisi immutable: lamaran asal tidak berubah", () => {
    const original = make()
    const snapshot = JSON.stringify(original)
    const result = applyTransition(
        original,
        "APPLIED",
        { cvVersion: "CV", appliedDate: "2026-11-10" },
        NOW,
    )
    assert.equal(JSON.stringify(original), snapshot)
    assert.equal(result.ok, true)
    if (result.ok) {
        assert.notEqual(result.application, original)
        assert.notEqual(result.application.activityLogs, original.activityLogs)
    }
})

test("ke INTERVIEW wajib jadwal, ke OFFER wajib gaji > 0 dan simpan workMode", () => {
    const screening = make({ status: "SCREENING" })
    assert.equal(applyTransition(screening, "INTERVIEW", {}, NOW).ok, false)
    const interview = applyTransition(
        screening,
        "INTERVIEW",
        { interviewDateTime: "2026-11-25T10:00" },
        NOW,
    )
    assert.equal(interview.ok, true)
    if (!interview.ok) return
    assert.equal(interview.application.interviewDateTime, "2026-11-25T10:00")

    assert.equal(
        applyTransition(interview.application, "OFFER", { salaryOffer: 0 }, NOW).ok,
        false,
    )
    const offer = applyTransition(
        interview.application,
        "OFFER",
        { salaryOffer: 5_500_000, workMode: "Hybrid" },
        NOW,
    )
    assert.equal(offer.ok, true)
    if (offer.ok) {
        assert.equal(offer.application.salaryOffer, 5_500_000)
        assert.equal(offer.application.workMode, "Hybrid")
    }
})

test("OFFER dan REJECTED final, GHOSTED hanya kembali ke SCREENING", () => {
    assert.equal(applyTransition(make({ status: "OFFER" }), "REJECTED", {}, NOW).ok, false)
    assert.equal(applyTransition(make({ status: "REJECTED" }), "SCREENING", {}, NOW).ok, false)
    assert.equal(applyTransition(make({ status: "GHOSTED" }), "APPLIED", {}, NOW).ok, false)
    assert.equal(applyTransition(make({ status: "GHOSTED" }), "SCREENING", {}, NOW).ok, true)
})

test("pindah status me-reset Rawan Ghosting", () => {
    const stale = shiftLastUpdated(
        make({ status: "APPLIED", lastUpdatedAt: NOW }),
        15,
    )
    const nowMs = new Date(NOW).getTime()
    assert.equal(isGhostingRisk(stale, nowMs), true)
    const result = applyTransition(stale, "SCREENING", {}, NOW)
    assert.equal(result.ok, true)
    if (result.ok) assert.equal(isGhostingRisk(result.application, nowMs), false)
})

test("checklist: tambah, centang, hapus tanpa mengubah objek asal", () => {
    const base = make()
    const withOne = addChecklistItem(base, "  Siapkan CV  ")
    assert.equal(base.checklist.length, 0)
    assert.equal(withOne.checklist.length, 1)
    assert.equal(withOne.checklist[0].text, "Siapkan CV")
    assert.equal(addChecklistItem(withOne, "   "), withOne)

    const withTwo = addChecklistItem(withOne, "Latihan soal")
    const firstId = withTwo.checklist[0].id
    const toggled = toggleChecklistItem(withTwo, firstId)
    assert.equal(withTwo.checklist[0].done, false)
    assert.equal(toggled.checklist[0].done, true)
    assert.equal(toggled.checklist[1].done, false)
    assert.deepEqual(getChecklistProgress(toggled), { done: 1, total: 2, percent: 50 })

    const removed = removeChecklistItem(toggled, firstId)
    assert.equal(toggled.checklist.length, 2)
    assert.equal(removed.checklist.length, 1)
    assert.deepEqual(getChecklistProgress(make()), { done: 0, total: 0, percent: 0 })
})

test("catatan manual masuk di depan activity log, kosong diabaikan", () => {
    const base = make()
    const noted = addNote(base, "  HRD bilang kabar minggu depan ", NOW)
    assert.equal(base.activityLogs.length, 0)
    assert.equal(noted.activityLogs[0].message, "Catatan: HRD bilang kabar minggu depan")
    assert.equal(addNote(noted, "   ", NOW), noted)
})

test("parseRupiah membaca format ketikan manual", () => {
    assert.equal(parseRupiah("6.000.000"), 6_000_000)
    assert.equal(parseRupiah("Rp 4500000"), 4_500_000)
    assert.equal(parseRupiah("abc"), undefined)
})
