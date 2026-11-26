// Realistische Beispieldaten für die öffentliche GitHub-Pages-Demo (wird im nativen App-Build nicht gebündelt).
import { addDays, todayISO } from "@/lib/dates"
import { db, type BodyWeight, type Cardio, type HipLog, type Session, type SetRow, type Settings } from "@/lib/db"
import type { UnitId } from "@/data/plan"
import type { SleepLog } from "@/data/sleep"

const DEMO_KEY = "workout:demo:state"

function tsAt(isoDate: string, hour: number): number {
  const [y, m, d] = isoDate.split("-").map(Number)
  return new Date(y, m - 1, d, hour, 0, 0, 0).getTime()
}

const CYCLE: UnitId[] = ["pushA", "pullA", "legsA", "zone2", "pushB", "pullB", "legsB", "intervals"]

type SetTemplate = { key: string; kg: number; reps: number[]; rir: number[] }

function templatesFor(unit: UnitId, p: number, cycleIdx: number): SetTemplate[] {
  switch (unit) {
    case "pushA":
      return [
        { key: "gym:bench-press", kg: 67.5 + p * 2.5, reps: [8, 8, 7 + (cycleIdx % 2)], rir: [2, 1, 1] },
        { key: "gym:dumbbell-shoulder-press", kg: 20 + Math.floor(p / 2) * 2, reps: [10, 9, 9], rir: [1, 1, 1] },
        { key: "gym:cable-fly", kg: 15 + Math.floor(p / 2) * 2.5, reps: [14, 13], rir: [1, 0] },
        { key: "gym:cable-lateral-raise", kg: 7.5 + (p >= 3 ? 2.5 : 0), reps: [15, 14, 14, 13], rir: [1, 1, 0, 0] },
        { key: "gym:cable-overhead-tricep-extension", kg: 22.5 + p * 2.5, reps: [12, 11, 11], rir: [1, 1, 0] },
        { key: "gym:tricep-pushdown", kg: 25 + Math.floor(p / 2) * 2.5, reps: [14, 13], rir: [1, 0] },
        { key: "gym:cable-crunch", kg: 35 + p * 2.5, reps: [14, 13, 12], rir: [1, 1, 1] },
      ]
    case "pullA":
      return [
        { key: "gym:pull-up", kg: 5 + p * 2.5, reps: [9, 8, 8], rir: [1, 1, 1] },
        { key: "gym:chest-supported-machine-row", kg: 60 + p * 5, reps: [8, 8, 7], rir: [2, 1, 1] },
        { key: "gym:v-bar-lat-pulldown", kg: 57.5 + p * 2.5, reps: [12, 11], rir: [1, 1] },
        { key: "gym:face-pull", kg: 20 + Math.floor(p / 2) * 2.5, reps: [18, 17, 16], rir: [1, 1, 0] },
        { key: "gym:incline-db-curl", kg: 12 + (p >= 2 ? 2 : 0), reps: [11, 10, 10], rir: [1, 1, 0] },
        { key: "gym:hammer-curl", kg: 14 + (p >= 3 ? 2 : 0), reps: [12, 11], rir: [1, 0] },
        { key: "gym:db-shrug", kg: 28 + p * 2, reps: [14, 13], rir: [1, 0] },
      ]
    case "legsA":
      return [
        { key: "gym:squat", kg: 87.5 + p * 2.5, reps: [8, 8, 7 + (cycleIdx % 2)], rir: [2, 1, 1] },
        { key: "gym:romanian-deadlift", kg: 92.5 + p * 2.5, reps: [8, 8, 8], rir: [2, 2, 1] },
        { key: "gym:bulgarian-split-squat", kg: 18 + Math.floor(p / 2) * 2, reps: [10, 10], rir: [1, 1] },
        { key: "gym:seated-leg-curl", kg: 50 + Math.floor(p / 2) * 5, reps: [12, 11, 11], rir: [1, 1, 0] },
        { key: "gym:standing-calf-raise", kg: 65 + p * 5, reps: [12, 11, 10], rir: [1, 1, 0] },
        { key: "gym:dead-bug", kg: 0, reps: [14, 13], rir: [1, 1] },
      ]
    case "pushB":
      return [
        { key: "gym:incline-dumbbell-press", kg: 26 + Math.floor(p / 2) * 2, reps: [11, 10, 10], rir: [1, 1, 1] },
        { key: "gym:chest-press-machine", kg: 65 + p * 5, reps: [12, 11], rir: [1, 0] },
        { key: "gym:cable-fly", kg: 15 + Math.floor(p / 2) * 2.5, reps: [15, 14], rir: [1, 0] },
        { key: "gym:machine-shoulder-press", kg: 45 + Math.floor(p / 2) * 5, reps: [11, 10], rir: [1, 1] },
        { key: "gym:lateral-raise", kg: 10 + (p >= 3 ? 2 : 0), reps: [16, 15, 14, 14], rir: [1, 1, 0, 0] },
        { key: "gym:cable-overhead-tricep-extension", kg: 22.5 + p * 2.5, reps: [13, 12], rir: [1, 0] },
        { key: "gym:tricep-pushdown", kg: 25 + Math.floor(p / 2) * 2.5, reps: [15, 14], rir: [1, 0] },
      ]
    case "pullB":
      return [
        { key: "gym:lat-pulldown", kg: 60 + p * 2.5, reps: [11, 10, 10], rir: [1, 1, 1] },
        { key: "gym:seated-cable-row", kg: 55 + p * 2.5, reps: [12, 11, 11], rir: [1, 1, 1] },
        { key: "gym:straight-arm-pulldown", kg: 22.5 + Math.floor(p / 2) * 2.5, reps: [14, 13], rir: [1, 0] },
        { key: "gym:machine-reverse-fly", kg: 35 + Math.floor(p / 2) * 5, reps: [16, 15, 14], rir: [1, 1, 0] },
        { key: "gym:cable-curl", kg: 20 + Math.floor(p / 2) * 2.5, reps: [13, 12, 12], rir: [1, 1, 0] },
        { key: "gym:hammer-curl", kg: 14 + (p >= 3 ? 2 : 0), reps: [12, 11], rir: [1, 0] },
      ]
    case "legsB":
      return [
        { key: "gym:leg-press", kg: 150 + p * 5, reps: [12, 12, 11], rir: [1, 1, 1] },
        { key: "gym:hip-thrust", kg: 110 + p * 5, reps: [11, 10, 10], rir: [1, 1, 1] },
        { key: "gym:leg-extension", kg: 55 + Math.floor(p / 2) * 5, reps: [14, 13, 13], rir: [1, 1, 0] },
        { key: "gym:seated-leg-curl", kg: 50 + Math.floor(p / 2) * 5, reps: [13, 12, 12], rir: [1, 1, 0] },
        { key: "gym:hip-adduction", kg: 45 + Math.floor(p / 2) * 5, reps: [15, 14], rir: [1, 0] },
        { key: "gym:standing-calf-raise", kg: 65 + p * 5, reps: [14, 13], rir: [1, 0] },
      ]
    default:
      return []
  }
}

export async function seedDemoData() {
  const today = todayISO()
  const sessions: Session[] = []
  const sets: SetRow[] = []
  const cardio: Cardio[] = []
  let sid = 1

  for (let cycleIdx = 0; cycleIdx < 10; cycleIdx++) {
    for (let step = 0; step < CYCLE.length; step++) {
      const daysAgo = (10 - cycleIdx) * 8 - step
      if (daysAgo <= 0) continue
      if (cycleIdx === 1 && step === 3) continue
      if (cycleIdx === 4 && step === 7) continue

      const unit = CYCLE[step]
      const date = addDays(today, -daysAgo)
      const startedAt = tsAt(date, 17)
      const mins = unit === "zone2" ? 45 : unit === "intervals" ? 40 : 55 + ((sid * 3) % 10)
      sessions.push({
        id: sid,
        date,
        unit,
        mode: sid % 6 === 0 ? "home" : "gym",
        status: "done",
        startedAt,
        endedAt: startedAt + mins * 60_000,
      })

      if (unit === "zone2" || unit === "intervals") {
        cardio.push({ date, kind: unit, minutes: mins, sessionId: sid })
      } else {
        const p = Math.floor(cycleIdx / 2)
        templatesFor(unit, p, cycleIdx).forEach((ex, exIdx) => {
          ex.reps.forEach((reps, i) => {
            sets.push({
              sessionId: sid,
              key: ex.key,
              exIdx,
              setNo: i + 1,
              kg: ex.kg,
              reps,
              rir: ex.rir[i] ?? 1,
              at: startedAt + (exIdx * 6 + i * 2) * 60_000,
            })
          })
        })
      }
      sid++
    }
  }

  const weights = [79.1, 78.9, 78.8, 78.5, 78.6, 78.3, 78.1, 78.2, 77.9, 77.8, 77.7, 77.5]
  const bodyweight: BodyWeight[] = weights.map((kg, i) => ({
    date: addDays(today, -(weights.length - 1 - i) * 3),
    kg,
  }))

  const sleep: SleepLog[] = []
  for (let d = 5; d >= 1; d--) {
    sleep.push({
      date: addDays(today, -d),
      done: ["wake-light", "caffeine-cutoff", "training-end", "last-meal", "warm-shower", "wind-down", "lights-out"],
      onset: d % 2 === 0 ? 0 : 1,
      hours: d === 1 ? 7.8 : 7.5,
      quality: d === 1 ? 3 : 2,
    })
  }
  sleep.push({
    date: today,
    done: ["wake-light", "caffeine-cutoff"],
    onset: 0,
    hours: 7.8,
    quality: 3,
  })

  const hip: HipLog[] = [{ date: addDays(today, -1), done: ["hip-flexor-stretch", "glute-bridge"], snap: 0, pain: false }]

  const settings: Settings = {
    id: "app",
    dumbbellsHome: true,
    notifications: true,
    lastMode: "gym",
    volumeBonus: { chest: 1, back: 1, shoulders: 1 },
    volumeCheckedWeek: addDays(today, -3),
    swaps: {},
    birthYear: 1995,
    hip: { type: "internal", since: addDays(today, -35) },
    sleepConfig: { wakeTime: "07:00", sleepHours: 8, notifications: true },
  }

  await db.transaction("rw", [db.sessions, db.sets, db.bodyweight, db.cardio, db.settings, db.hip, db.sleep], async () => {
    await Promise.all([db.sessions.clear(), db.sets.clear(), db.bodyweight.clear(), db.cardio.clear(), db.settings.clear(), db.hip.clear(), db.sleep.clear()])
    await db.sessions.bulkPut(sessions)
    await db.sets.bulkAdd(sets)
    await db.bodyweight.bulkPut(bodyweight)
    await db.cardio.bulkAdd(cardio)
    await db.settings.put(settings)
    await db.hip.bulkPut(hip)
    await db.sleep.bulkPut(sleep)
  })
  localStorage.setItem(DEMO_KEY, "seeded")
}

export async function clearDemoData() {
  await db.transaction("rw", [db.sessions, db.sets, db.bodyweight, db.cardio, db.settings, db.hip, db.sleep], async () => {
    await Promise.all([db.sessions.clear(), db.sets.clear(), db.bodyweight.clear(), db.cardio.clear(), db.settings.clear(), db.hip.clear(), db.sleep.clear()])
  })
  localStorage.setItem(DEMO_KEY, "empty")
}

/** Lädt beim allerersten Demo-Besuch automatisch Beispieldaten, falls die DB noch leer ist. */
export async function ensureInitialDemoSeed() {
  if (localStorage.getItem(DEMO_KEY)) return
  const count = await db.sessions.count()
  if (count === 0) await seedDemoData()
}
