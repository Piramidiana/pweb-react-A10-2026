import assert from "node:assert/strict"
import { test } from "node:test"
import type { Application } from "../src/types"
import {
    calculateSkillMatch,
    calculateStats,
    canTransition,
    compareOffers,
    findInterviewClashes,
    getMatchTone,
    getNextStatuses,
    hasSkill,
    isDuplicateApplication,
    isFinalStatus,
    isGhostingRisk,
    parseSkillList,
    shiftLastUpdated,
    validateTransitionData,
} from "../src/utils"

const NOW = new Date("2026-11-20T10:00:00Z").getTime()
const DAY = 24 * 60 * 60 * 1000

function make(overrides: Partial<Application> = {}): Application {
    return {
        id: "1",
        company: "Nusantara Cloud",
        role: "Frontend Intern",
        workMode: "Hybrid",
        status: "WISHLIST",
        requiredSkills: ["React", "TypeScript", "CSS", "Docker"],
        lastUpdatedAt: new Date(NOW).toISOString(),
        checklist: [],
        activityLogs: [],
        ...overrides,
    }
}

test("skill match 3 dari 4 = 75% dan Docker missing (case-insensitive)", () => {
    const result = calculateSkillMatch(
        ["React", "TypeScript", "CSS", "Docker"],
        ["react", "TYPESCRIPT", "css"],
    )
    assert.equal(result.score, 75)
    assert.deepEqual(result.missing, ["Docker"])
    assert.deepEqual(result.matched, ["React", "TypeScript", "CSS"])
})

test("skill match tanpa required = 0 dan warna sesuai batas", () => {
    assert.equal(calculateSkillMatch([], ["React"]).score, 0)
    assert.equal(getMatchTone(70), "green")
    assert.equal(getMatchTone(69), "yellow")
    assert.equal(getMatchTone(40), "yellow")
    assert.equal(getMatchTone(39), "red")
})

test("skill duplikat ditolak tanpa peduli huruf besar/kecil", () => {
    assert.equal(hasSkill(["React"], " react "), true)
    assert.equal(hasSkill(["React"], "Docker"), false)
    assert.deepEqual(parseSkillList("React, react , CSS,,"), ["React", "CSS"])
})

test("anti-duplikat company + role", () => {
    const list = [make()]
    assert.equal(
        isDuplicateApplication(list, "nusantara cloud ", "FRONTEND intern"),
        true,
    )
    assert.equal(isDuplicateApplication(list, "Nusantara Cloud", "Backend"), false)
})

test("state machine: WISHLIST tidak bisa ke OFFER, final dan GHOSTED", () => {
    assert.equal(canTransition("WISHLIST", "APPLIED"), true)
    assert.equal(canTransition("WISHLIST", "OFFER"), false)
    assert.equal(isFinalStatus("OFFER"), true)
    assert.equal(isFinalStatus("REJECTED"), true)
    assert.deepEqual(getNextStatuses("GHOSTED"), ["SCREENING"])
})

test("syarat pindah status APPLIED, INTERVIEW, OFFER", () => {
    const app = make()
    assert.deepEqual(
        Object.keys(validateTransitionData(app, "APPLIED", {})).sort(),
        ["appliedDate", "cvVersion"],
    )
    assert.deepEqual(
        validateTransitionData(app, "APPLIED", {
            cvVersion: "CV v2",
            appliedDate: "2026-11-20",
        }),
        {},
    )
    assert.ok(validateTransitionData(app, "INTERVIEW", {}).interviewDateTime)
    assert.ok(validateTransitionData(app, "OFFER", { salaryOffer: 0 }).salaryOffer)
    assert.deepEqual(
        validateTransitionData(app, "OFFER", { salaryOffer: 5000000 }),
        {},
    )
})

test("rawan ghosting: hanya APPLIED/SCREENING lebih dari 14 hari", () => {
    const old = new Date(NOW - 15 * DAY).toISOString()
    assert.equal(isGhostingRisk(make({ status: "APPLIED", lastUpdatedAt: old }), NOW), true)
    assert.equal(isGhostingRisk(make({ status: "SCREENING", lastUpdatedAt: old }), NOW), true)
    assert.equal(isGhostingRisk(make({ status: "INTERVIEW", lastUpdatedAt: old }), NOW), false)
    const edge = new Date(NOW - 14 * DAY).toISOString()
    assert.equal(isGhostingRisk(make({ status: "APPLIED", lastUpdatedAt: edge }), NOW), false)
})

test("simulasi +15 hari memundurkan lastUpdatedAt tanpa mutasi", () => {
    const app = make({ status: "APPLIED" })
    const shifted = shiftLastUpdated(app, 15)
    assert.notEqual(shifted, app)
    assert.equal(app.lastUpdatedAt, new Date(NOW).toISOString())
    assert.equal(isGhostingRisk(shifted, NOW), true)
})

test("bentrok interview: selisih < 60 menit, 60 menit pas tidak bentrok", () => {
    const a = make({ id: "a", status: "INTERVIEW", interviewDateTime: "2026-12-01T09:00" })
    const b = make({ id: "b", status: "INTERVIEW", interviewDateTime: "2026-12-01T09:30" })
    const c = make({ id: "c", status: "INTERVIEW", interviewDateTime: "2026-12-01T10:30" })
    const d = make({ id: "d", status: "SCREENING", interviewDateTime: "2026-12-01T09:10" })

    const clashes = findInterviewClashes([a, b, c, d])
    assert.equal(clashes.length, 1)
    assert.equal(clashes[0]?.minutesApart, 30)
    assert.equal(findInterviewClashes([a, c]).length, 0)
    assert.equal(findInterviewClashes([a, make({ id: "e", status: "INTERVIEW", interviewDateTime: "2026-12-01T10:00" })]).length, 0)
})

test("offer comparator: skor berbobot dan pemenang", () => {
    const skills = ["React", "TypeScript", "CSS"]
    const a = make({ id: "a", status: "OFFER", workMode: "Remote", salaryOffer: 4000000, requiredSkills: ["React", "TypeScript", "CSS", "Docker"] })
    const b = make({ id: "b", status: "OFFER", workMode: "Onsite", salaryOffer: 5000000, requiredSkills: ["React", "TypeScript"] })
    const result = compareOffers(a, b, skills)

    // A: gaji 80 x .5 + remote 100 x .25 + match 75 x .25 = 40 + 25 + 18.75
    assert.equal(result.a.total, 83.75)
    // B: gaji 100 x .5 + onsite 50 x .25 + match 100 x .25 = 50 + 12.5 + 25
    assert.equal(result.b.total, 87.5)
    assert.equal(result.winner, "b")
})

test("offer comparator sesuai contoh wireframe: 95.0 vs 81.3", () => {
    const skills = ["React", "TypeScript", "CSS", "Git"]
    const bintang = make({ id: "a", status: "OFFER", workMode: "Remote", salaryOffer: 6000000, requiredSkills: ["React", "TypeScript", "CSS", "Git", "Testing"] })
    const nusantara = make({ id: "b", status: "OFFER", workMode: "Hybrid", salaryOffer: 4500000, requiredSkills: ["React", "TypeScript", "CSS", "Git"] })
    const result = compareOffers(bintang, nusantara, skills)

    assert.equal(result.a.skillScore, 80)
    assert.equal(result.a.total, 95)
    assert.equal(result.b.total.toFixed(1), "81.3")
    assert.equal(result.winner, "a")
})

test("interview bisa pindah ke OFFER, REJECTED, atau GHOSTED", () => {
    assert.deepEqual(getNextStatuses("INTERVIEW"), ["OFFER", "REJECTED", "GHOSTED"])
})

test("statistik dashboard dihitung dari data", () => {
    const old = new Date(NOW - 20 * DAY).toISOString()
    const stats = calculateStats(
        [
            make({ id: "1", status: "WISHLIST" }),
            make({ id: "2", status: "APPLIED", lastUpdatedAt: old }),
            make({ id: "3", status: "INTERVIEW" }),
            make({ id: "4", status: "OFFER" }),
        ],
        NOW,
    )
    assert.equal(stats.total, 4)
    assert.equal(stats.ghostingRisk, 1)
    assert.equal(stats.totalOffer, 1)
    assert.equal(stats.responseRate, 50)
    assert.equal(stats.interviewRate, 50)
})
