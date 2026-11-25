import { describe, expect, it } from "vitest"
import { addDays } from "./dates"
import { todayPlan, preview, isReentry } from "./schedule"
import { adjustNextSet, e1rmBodyweight, loadFor, nextTarget, suggestReps, warmupSets } from "./progression"
import { isDeclining, needsDeload } from "./deload"
import { extraSetsMap, increaseBonus, plannedWeeklySets, progressedMuscles } from "./volume"
import { phaseIndex, timeline, formatClock } from "./timer"
import { resolveVariant } from "./workout"
import { UNITS, allExerciseIds, type UnitId } from "@/data/plan"
import exercisesJson from "@/data/exercises.json"
import { avgWeight, benchPercentile } from "@/data/norms"
import { HIP_ITEMS, HIP_RISK, hipBlocksFor, hipExerciseIds, hipItemsFor } from "@/data/hip"
import { DEFAULT_SLEEP_CONFIG, bedtimeFrom, buildSleepRoutine, isNight, nextSleepStep, shouldCompress, trainingAdviceFromSleep } from "@/data/sleep"

// 2026-11-09 ist ein Montag
const MO = "2026-11-09"
const d = (i: number) => `2026-11-${String(9 + i).padStart(2, "0")}`

describe("schedule", () => {
  type E = { date: string; unit: UnitId }
  const e = (i: number, unit: UnitId): E => ({ date: d(i), unit })

  it("ohne Historie: Push A", () => {
    expect(todayPlan(MO, [])).toEqual({ kind: "strength", unit: "pushA" })
  })

  it("Rotation Push → Pull → Beine", () => {
    expect(todayPlan(d(1), [e(0, "pushA")])).toEqual({ kind: "strength", unit: "pullA" })
    expect(todayPlan(d(2), [e(0, "pushA"), e(1, "pullA")])).toEqual({ kind: "strength", unit: "legsA" })
  })

  it("nach Beine A: Erholungstag mit Zone 2, danach Push B", () => {
    const done = [e(0, "pushA"), e(1, "pullA"), e(2, "legsA")]
    expect(todayPlan(d(3), done)).toEqual({ kind: "recovery", cardio: "zone2", next: "pushB", cardioDone: false })
    expect(todayPlan(d(4), done)).toEqual({ kind: "strength", unit: "pushB" })
  })

  it("nach Beine B: Intervalle, danach wieder Push A", () => {
    const done = [e(0, "pushB"), e(1, "pullB"), e(2, "legsB")]
    expect(todayPlan(d(3), done)).toMatchObject({ kind: "recovery", cardio: "intervals", next: "pushA" })
    expect(todayPlan(d(3), [...done, e(3, "intervals")])).toMatchObject({ cardioDone: true })
  })

  it("Erholungstag übersprungen: direkt weiter", () => {
    const done = [e(0, "pushA"), e(1, "pullA"), e(2, "legsA"), e(3, "pushB")]
    expect(todayPlan(d(3), done)).toEqual({ kind: "done", unit: "pushB", next: "pullB" })
    expect(todayPlan(d(4), done)).toEqual({ kind: "strength", unit: "pullB" })
  })

  it("Pausen verschieben nichts, Ausklang zählt nicht als Einheit", () => {
    expect(todayPlan(d(5), [e(0, "pushA"), e(0, "cooldown")])).toEqual({ kind: "strength", unit: "pullA" })
  })

  it("Vorschau mit Erholungstag nach jedem Beine-Tag", () => {
    const p = preview(d(1), [e(0, "pushA")], 8)
    expect(p.map((x) => x.unit ?? x.cardio)).toEqual(["pullA", "legsA", "zone2", "pushB", "pullB", "legsB", "intervals", "pushA"])
  })

  it("Wiedereinstieg ab 7 Tagen Pause", () => {
    expect(isReentry("2026-11-01", MO)).toBe(true)
    expect(isReentry("2026-11-03", MO)).toBe(false)
    expect(isReentry(null, MO)).toBe(false)
  })
})

describe("progression", () => {
  const s = (kg: number, ...reps: number[]) => reps.map((r) => ({ kg, reps: r, rir: null as number | null }))

  it("Start ohne Historie", () => {
    expect(nextTarget([], [6, 8], "barbell")).toEqual({ kg: 20, reason: "start" })
  })

  it("alle Sätze am oberen Ende: +1 Stufe", () => {
    expect(nextTarget([s(60, 8, 8, 8)], [6, 8], "barbell").kg).toBe(62.5)
    expect(nextTarget([s(20, 12, 12)], [10, 12], "dumbbell").kg).toBe(22)
    expect(nextTarget([s(40, 12, 12, 12)], [10, 12], "machine").kg).toBe(45)
  })

  it("Wdh gestiegen, oben nicht erreicht: halten", () => {
    expect(nextTarget([s(60, 8, 7, 7), s(60, 7, 6, 6)], [6, 8], "barbell")).toEqual({ kg: 60, reason: "hold" })
  })

  it("letzter Satz RIR 3+: +2 Stufen bei Ziel-RIR bis 1, sonst +1", () => {
    const last = s(60, 7, 7, 7)
    last[2].rir = 3
    expect(nextTarget([last], [6, 8], "barbell", false, [0, 1]).kg).toBe(65)
    expect(nextTarget([last], [6, 8], "barbell", false, [2, 2])).toEqual({ kg: 62.5, reason: "up1" })
  })

  it("unteren Rand zweimal verfehlt: −7,5 %", () => {
    expect(nextTarget([s(100, 5, 5, 4), s(100, 6, 5, 5)], [6, 8], "barbell")).toEqual({ kg: 92.5, reason: "reset" })
  })

  it("einmal verfehlt: halten", () => {
    expect(nextTarget([s(100, 5, 5, 4), s(97.5, 8, 8, 8)], [6, 8], "barbell").reason).toBe("hold")
  })

  it("Home: erst Wdh, dann +2,5 kg Rucksack", () => {
    expect(nextTarget([s(0, 15, 14)], [10, 20], "rucksack").kg).toBe(0)
    expect(nextTarget([s(0, 20, 20)], [10, 20], "rucksack").kg).toBe(2.5)
  })

  it("ohne Zusatzlast nur Wdh", () => {
    expect(nextTarget([s(0, 8, 8)], [4, 8], "rucksack", true)).toEqual({ kg: 0, reason: "top" })
  })

  it("Wdh-Vorschlag und Aufwärmen", () => {
    expect(suggestReps([s(60, 8, 7, 6)], 1, 60, [6, 8])).toBe(7)
    expect(suggestReps([s(60, 8, 8, 8)], 0, 62.5, [6, 8])).toBe(6)
    expect(warmupSets(100, "barbell")).toEqual([
      { kg: 50, reps: 8 },
      { kg: 75, reps: 4 },
    ])
  })
})

describe("deload", () => {
  const s = (kg: number, ...reps: number[]) => reps.map((r) => ({ kg, reps: r }))
  it("Abfall bei gleicher Last zweimal nacheinander", () => {
    expect(isDeclining([s(100, 6, 6, 5), s(100, 7, 6, 6), s(100, 8, 7, 7)])).toBe(true)
    expect(isDeclining([s(100, 6, 6, 5), s(100, 7, 6, 6), s(97.5, 8, 7, 7)])).toBe(false)
    expect(isDeclining([s(100, 7, 6, 6), s(100, 8, 7, 7)])).toBe(false)
  })
  it("zwei Grundübungen nötig", () => {
    const down = [s(100, 6, 6, 5), s(100, 7, 6, 6), s(100, 8, 7, 7)]
    const up = [s(100, 8, 8, 8), s(100, 7, 6, 6), s(100, 6, 6, 6)]
    expect(needsDeload([down, up])).toBe(false)
    expect(needsDeload([down, down, up])).toBe(true)
  })
})

describe("volume", () => {
  it("Basisvolumen im Plan-Korridor", () => {
    const v = plannedWeeklySets({})
    for (const m of ["chest", "back", "shoulders", "triceps", "biceps", "quads", "hamstrings"] as const) {
      expect(v[m]).toBeGreaterThanOrEqual(10)
      expect(v[m]).toBeLessThanOrEqual(20)
    }
  })
  it("Bonus wird reihum verteilt", () => {
    const m = extraSetsMap({ chest: 2 })
    expect(m.get("pushA:0")).toBe(1)
    expect(m.get("pushA:2")).toBe(1)
  })
  it("Schulter-Bonus geht zuerst ans Seitheben", () => {
    const m = extraSetsMap({ shoulders: 2 })
    expect(m.get("pushA:3")).toBe(1)
    expect(m.get("pushB:3")).toBe(1)
  })
  it("maximal 20 Sätze pro Woche", () => {
    let b = {}
    for (let i = 0; i < 20; i++) b = increaseBonus(b, new Set(["chest"] as const))
    expect(plannedWeeklySets(b).chest).toBeLessThanOrEqual(20)
    expect(plannedWeeklySets(b).chest).toBeGreaterThan(19)
  })
  it("Fortschritt erkennen", () => {
    const occ = [
      { primary: "chest" as const, key: "gym:bench-press", date: d(0), sets: [{ kg: 60, reps: 6 }] },
      { primary: "chest" as const, key: "gym:bench-press", date: d(7), sets: [{ kg: 60, reps: 8 }] },
      { primary: "back" as const, key: "gym:pull-up", date: d(4), sets: [{ kg: 0, reps: 8 }] },
    ]
    expect([...progressedMuscles(occ)]).toEqual(["chest"])
  })
})

describe("timer", () => {
  it("Cardio-Phasen ergeben ca. 40 min", () => {
    const u = UNITS.intervals
    if (u.type !== "cardio") throw new Error()
    const tl = timeline(u.phases, 0)
    expect(tl[tl.length - 1].endAt).toBe(40 * 60_000)
    expect(phaseIndex(tl, 10 * 60_000)).toBe(1)
    expect(phaseIndex(tl, 41 * 60_000)).toBe(tl.length)
    expect(formatClock(90_000)).toBe("1:30")
  })
})

describe("kalibrierung", () => {
  it("erstes Mal: aus Satz 1 die Last für den Zielbereich schätzen", () => {
    // 20 kg × 12, RIR 3 → bis Versagen 15 Wdh → 1RM 30 kg; Ziel 7 Wdh + RIR 1,5 → 22,5 kg
    expect(loadFor({ kg: 20, reps: 12, rir: 3 }, [6, 8], [1, 2], "barbell")).toBe(22.5)
    expect(adjustNextSet({ kg: 20, reps: 12, rir: 3 }, [6, 8], [1, 2], "barbell", true)).toBe(22.5)
  })
  it("3+ bei Ziel-RIR 2 erhöht auch nach der ersten Einheit", () => {
    expect(adjustNextSet({ kg: 60, reps: 8, rir: 3 }, [6, 8], [1, 2], "barbell", false)).toBe(65)
  })
  it("im Ziel bleibt das Gewicht", () => {
    expect(adjustNextSet({ kg: 60, reps: 7, rir: 1 }, [6, 8], [1, 2], "barbell", false)).toBeNull()
  })
  it("zu schwer: runter, ohne RIR wird Versagen angenommen", () => {
    expect(adjustNextSet({ kg: 60, reps: 4, rir: null }, [6, 8], [1, 2], "barbell", false)).toBe(52.5)
  })
  it("ohne Last nichts anpassen", () => {
    expect(adjustNextSet({ kg: 0, reps: 15, rir: 4 }, [6, 10], [1, 1], "bodyweight", true)).toBeNull()
  })
  it("Klimmzug-1RM zählt das Körpergewicht", () => {
    expect(e1rmBodyweight({ kg: 0, reps: 6 }, 80)).toBeCloseTo(96)
    expect(e1rmBodyweight({ kg: 10, reps: 3 }, 80)).toBeCloseTo(99)
  })
})

describe("plan-daten", () => {
  it("jede Übung und Alternative hat Bilder und Texte", () => {
    const ex = exercisesJson as Record<string, { images: string[] }>
    for (const id of allExerciseIds()) expect(ex[id]?.images.length, id).toBeGreaterThan(0)
  })
  it("Waden, Bauch und Gesäß bekommen mehr Volumen", () => {
    const w = plannedWeeklySets({})
    expect(w.calves).toBeGreaterThanOrEqual(7)
    expect(w.abs).toBeGreaterThanOrEqual(7.5)
    expect(w.glutes).toBeGreaterThanOrEqual(10)
  })
})

describe("vergleich", () => {
  it("Perzentil Bankdrücken: Median, Ränder, Altersgruppe", () => {
    expect(benchPercentile(1.06, 25)).toBe(50)
    expect(benchPercentile(0.93, 35)).toBe(50)
    expect(benchPercentile(1.08, 35)).toBe(75)
    expect(benchPercentile(0.3, 35)).toBeGreaterThanOrEqual(1)
    expect(benchPercentile(3, 35)).toBe(99)
  })
  it("Durchschnittsgewicht nach Alter", () => {
    expect(avgWeight(35)).toBe(87.4)
    expect(avgWeight(19)).toBe(76.7)
  })
})

describe("hüfte", () => {
  it("Hüftprogramm tauscht Bauchübungen mit viel Hüftbeugung gegen Dead Bug", () => {
    const ex = UNITS.legsA.type === "strength" ? UNITS.legsA.exercises.find((e) => e.gym.exId === "hanging-leg-raise")! : null!
    expect(resolveVariant(ex, "gym", false, undefined, true).variant.exId).toBe("dead-bug")
    expect(resolveVariant(ex, "home", false, undefined, true).key).toBe("home:dead-bug")
    expect(resolveVariant(ex, "gym", false, "hanging-leg-raise", true).variant.exId).toBe("hanging-leg-raise")
    expect(resolveVariant(ex, "gym", false, undefined, false).variant.exId).toBe("hanging-leg-raise")
  })
  const ex = exercisesJson as Record<string, { images: string[] }>
  it("alle Hüftübungen haben Bilder, IDs eindeutig", () => {
    for (const id of hipExerciseIds()) expect(ex[id]?.images.length, id).toBeGreaterThan(0)
    expect(new Set(HIP_ITEMS.map((i) => i.id)).size).toBe(HIP_ITEMS.length)
  })
  it("Kraft nie an Beintagen, Aktivierung nur an Beintagen", () => {
    expect(hipBlocksFor("legsA")).toEqual(["mobility", "activation"])
    expect(hipBlocksFor("pushB")).toEqual(["mobility"])
    expect(hipBlocksFor("pullA")).toContain("strength")
    expect(hipBlocksFor(null)).toContain("strength")
  })
  it("Kraftblock liegt im 8-Tage-Zyklus alle 2 Tage", () => {
    const cycle = ["pushA", "pullA", "legsA", null, "pushB", "pullB", "legsB", null]
    const days = cycle.flatMap((u, i) => (hipBlocksFor(u).includes("strength") ? [i] : []))
    expect(days).toEqual([1, 3, 5, 7])
  })
  it("Typ filtert die Übungen", () => {
    const ext = hipItemsFor(null, "external").map((i) => i.exId)
    const int = hipItemsFor(null, "internal").map((i) => i.exId)
    expect(ext).toContain("banded-it-band-stretch")
    expect(ext).not.toContain("dead-bug")
    expect(int).toContain("dead-bug")
    expect(int).not.toContain("banded-it-band-stretch")
    expect(hipItemsFor(null, "unknown").length).toBeGreaterThanOrEqual(ext.length)
  })
  it("Risiko-Übungen existieren im Plan", () => {
    const ids = new Set(allExerciseIds())
    for (const id of Object.keys(HIP_RISK)) expect(ids.has(id), id).toBe(true)
  })
})

describe("schlaf", () => {
  it("berechnet die Uhrzeiten aus der Aufstehzeit", () => {
    expect(bedtimeFrom("06:30", 8)).toBe("22:30")
    expect(bedtimeFrom("07:00", 7.5)).toBe("23:30")
    expect(buildSleepRoutine(DEFAULT_SLEEP_CONFIG).map((s) => s.time)).toEqual(["06:30", "13:30", "19:30", "21:00", "21:30", "22:30"])
    expect(buildSleepRoutine(DEFAULT_SLEEP_CONFIG, "legsA").some((s) => s.id === "training-end")).toBe(true)
    expect(buildSleepRoutine(DEFAULT_SLEEP_CONFIG, "zone2").some((s) => s.id === "training-end")).toBe(false)
  })

  it("findet den nächsten Schritt und erkennt die Nacht", () => {
    const steps = buildSleepRoutine(DEFAULT_SLEEP_CONFIG)
    expect(nextSleepStep(steps, 12 * 60)).toMatchObject({ step: { id: "caffeine-cutoff" }, inMinutes: 90 })
    expect(nextSleepStep(steps, 23 * 60)).toMatchObject({ step: { id: "wake-light" }, inMinutes: 450 })
    expect(isNight(DEFAULT_SLEEP_CONFIG, 23 * 60)).toBe(true)
    expect(isNight(DEFAULT_SLEEP_CONFIG, 3 * 60)).toBe(true)
    expect(isNight(DEFAULT_SLEEP_CONFIG, 12 * 60)).toBe(false)
  })

  it("schlägt kürzere Bettzeit vor, wenn du oft lange wach liegst", () => {
    const logs = (o: number[]) => o.map((onset, i) => ({ date: addDays(MO, -i), done: [], onset: onset as 0 | 1 | 2 | 3 }))
    expect(shouldCompress(logs([2, 3, 2, 2, 0, 0, 0]), DEFAULT_SLEEP_CONFIG)).toBe(true)
    expect(shouldCompress(logs([2, 3, 2, 0, 0, 0, 0]), DEFAULT_SLEEP_CONFIG)).toBe(false)
    expect(shouldCompress(logs([3, 3, 3, 3]), { ...DEFAULT_SLEEP_CONFIG, sleepHours: 6.5 })).toBe(false)
    expect(shouldCompress(logs([2, 3, 2, 2, 0, 0, 0]), { ...DEFAULT_SLEEP_CONFIG, compressedAt: addDays(MO, -3) })).toBe(false)
  })

  it("gibt Trainingsempfehlung bei Schlafdefizit", () => {
    expect(trainingAdviceFromSleep({ date: MO, done: [], hours: 5.5, quality: 1 })?.status).toBe("warning")
    expect(trainingAdviceFromSleep({ date: MO, done: [], hours: 8, quality: 3 })?.status).toBe("optimal")
  })
})
