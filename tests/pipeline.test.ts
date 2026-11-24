import assert from "node:assert/strict"
import { test } from "node:test"
import type { Application } from "../src/types"
import {
    DEFAULT_FILTERS,
    filterApplications,
    findInterviewClashes,
    getPipelineView,
    isGhostingRisk,
    parseSort,
    parseStatusFilter,
    simulateDays,
    sortApplications,
} from "../src/utils"

const NOW = new Date("2026-11-23T10:00:00Z").getTime()
const NOW_ISO = new Date(NOW).toISOString()

function make(overrides: Partial<Application> = {}): Application {
    return {
        id: "1",
        company: "Nusantara Cloud",
        role: "Frontend Intern",
        workMode: "Hybrid",
        status: "WISHLIST",
        requiredSkills: ["React", "CSS"],
        lastUpdatedAt: NOW_ISO,
        checklist: [],
        activityLogs: [],
        ...overrides,
    }
}

const list: Application[] = [
    make({ id: "a", company: "Garuda FinTech", role: "Full-Stack Intern", status: "APPLIED", cvVersion: "CV-v2" }),
    make({ id: "b", company: "Bintang Commerce", role: "SWE Intern", status: "SCREENING", requiredSkills: ["Docker"] }),
    make({ id: "c", company: "AwanMerdeka", role: "DevOps Intern", status: "OFFER", salaryOffer: 5_000_000 }),
    make({ id: "d", company: "Kopi Digital", role: "QA Intern", status: "OFFER", salaryOffer: 6_000_000 }),
]

test("filter teks tidak peduli huruf besar/kecil dan mencari di company, role, CV, skill", () => {
    const f = (query: string) =>
        filterApplications(list, { ...DEFAULT_FILTERS, query }, NOW).map((x) => x.id)
    assert.deepEqual(f("GARUDA"), ["a"])
    assert.deepEqual(f("devops"), ["c"])
    assert.deepEqual(f("cv-v2"), ["a"])
    assert.deepEqual(f("docker"), ["b"])
    assert.deepEqual(f("  "), ["a", "b", "c", "d"])
})

test("filter status dan toggle ghosting berlaku bersamaan", () => {
    const stale = make({
        id: "g",
        status: "APPLIED",
        lastUpdatedAt: new Date(NOW - 15 * 24 * 3600 * 1000).toISOString(),
    })
    const data = [...list, stale]
    const ids = (filters: Partial<typeof DEFAULT_FILTERS>) =>
        filterApplications(data, { ...DEFAULT_FILTERS, ...filters }, NOW).map((x) => x.id)

    assert.deepEqual(ids({ status: "OFFER" }), ["c", "d"])
    assert.deepEqual(ids({ ghostingOnly: true }), ["g"])
    assert.deepEqual(ids({ ghostingOnly: true, status: "OFFER" }), [])
    assert.deepEqual(ids({ ghostingOnly: true, query: "nusantara" }), ["g"])
})

test("sort offer tertinggi: gaji terbesar dulu, tanpa gaji di akhir", () => {
    const ids = sortApplications(list, "offer", NOW).map((x) => x.id)
    assert.deepEqual(ids, ["d", "c", "a", "b"])
})

test("sort jadwal interview: akan datang terdekat, lalu lewat, lalu tanpa jadwal", () => {
    const data = [
        make({ id: "none", status: "APPLIED" }),
        make({ id: "past", status: "INTERVIEW", interviewDateTime: "2026-11-20T09:00" }),
        make({ id: "far", status: "INTERVIEW", interviewDateTime: "2026-12-01T09:00" }),
        make({ id: "soon", status: "INTERVIEW", interviewDateTime: "2026-11-25T09:00" }),
    ]
    const ids = sortApplications(data, "interview", NOW).map((x) => x.id)
    assert.deepEqual(ids, ["soon", "far", "past", "none"])
})

test("sort terbaru memakai log paling awal sebagai waktu dibuat", () => {
    const log = (t: string) => ({ id: t, timestamp: t, message: "x" })
    const data = [
        make({ id: "old", activityLogs: [log("2026-11-10T00:00:00Z")] }),
        make({ id: "new", activityLogs: [log("2026-11-22T00:00:00Z")] }),
        make({
            id: "mid",
            activityLogs: [log("2026-11-23T00:00:00Z"), log("2026-11-15T00:00:00Z")],
        }),
    ]
    assert.deepEqual(sortApplications(data, "newest", NOW).map((x) => x.id), ["new", "mid", "old"])
})

test("filter dan sort tidak mengubah array asal", () => {
    const snapshot = list.map((x) => x.id)
    getPipelineView(list, { ...DEFAULT_FILTERS, sort: "offer" }, NOW)
    assert.deepEqual(list.map((x) => x.id), snapshot)
})

test("parseStatusFilter dan parseSort menolak nilai asing", () => {
    assert.equal(parseStatusFilter("INTERVIEW"), "INTERVIEW")
    assert.equal(parseStatusFilter("ngawur"), "ALL")
    assert.equal(parseSort("offer"), "offer")
    assert.equal(parseSort("ngawur"), "newest")
})

test("Simulasi +15 Hari memunculkan Rawan Ghosting dan mencatat log", () => {
    const applied = make({ status: "APPLIED" })
    assert.equal(isGhostingRisk(applied, NOW), false)
    const simulated = simulateDays(applied, 15, NOW_ISO)
    assert.equal(isGhostingRisk(simulated, NOW), true)
    assert.equal(isGhostingRisk(applied, NOW), false)
    assert.match(simulated.activityLogs[0].message, /Simulasi \+15 hari/)
})

test("bentrok dicek dari seluruh data walau filter status lain aktif", () => {
    const data = [
        make({ id: "x", company: "Garuda", status: "INTERVIEW", interviewDateTime: "2026-11-22T10:00" }),
        make({ id: "y", company: "Bintang", status: "INTERVIEW", interviewDateTime: "2026-11-22T10:30" }),
        make({ id: "z", status: "APPLIED" }),
    ]
    const visible = filterApplications(data, { ...DEFAULT_FILTERS, status: "APPLIED" }, NOW)
    assert.deepEqual(visible.map((x) => x.id), ["z"])
    const clashes = findInterviewClashes(data)
    assert.equal(clashes.length, 1)
    assert.equal(clashes[0]?.minutesApart, 30)
})
