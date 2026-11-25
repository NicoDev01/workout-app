// Sätze pro Muskel und automatische Volumensteigerung.
import { ROTATION, STRENGTH_UNITS, type MuscleGroup, type PlanExercise } from "@/data/plan"
import { e1rm, type SetRec } from "./progression"

export const MAX_WEEKLY_SETS = 20
export const CORRIDOR: [number, number] = [10, 20]

export type Bonus = Partial<Record<MuscleGroup, number>>

/** Hier gehen Zusatzsätze zuerst an Isolationsübungen: Drücken trifft schon die vordere Schulter, Seitheben die seitliche. */
const ISOLATION_FIRST: MuscleGroup[] = ["shoulders"]

/** Primärmuskel zählt 1, Sekundärmuskel 0,5 */
export function countSets(items: { ex: Pick<PlanExercise, "primary" | "secondary">; sets: number }[]) {
  const out: Partial<Record<MuscleGroup, number>> = {}
  for (const { ex, sets } of items) {
    out[ex.primary] = (out[ex.primary] ?? 0) + sets
    for (const m of ex.secondary) out[m] = (out[m] ?? 0) + sets * 0.5
  }
  return out
}

/** Ein Zyklus (6 Krafttage + 2 Erholungstage) dauert 8 Tage */
export const CYCLE_DAYS = ROTATION.length + 2
const strengthUnits = () => STRENGTH_UNITS

/**
 * Zusätzliche Sätze je Übung: Bonus eines Muskels geht reihum an seine Übungen
 * (Wochenreihenfolge). Schlüssel: `${unitId}:${index}`.
 */
export function extraSetsMap(bonus: Bonus): Map<string, number> {
  const map = new Map<string, number>()
  for (const [muscle, b] of Object.entries(bonus) as [MuscleGroup, number][]) {
    const slots: string[] = []
    const iso: string[] = []
    for (const u of strengthUnits())
      u.exercises.forEach((e, i) => {
        if (e.primary !== muscle) return
        ;(ISOLATION_FIRST.includes(muscle) && e.secondary.length === 0 ? iso : slots).push(`${u.id}:${i}`)
      })
    slots.unshift(...iso)
    for (let k = 0; k < b && slots.length; k++) {
      const key = slots[k % slots.length]
      map.set(key, (map.get(key) ?? 0) + 1)
    }
  }
  return map
}

/** Sätze pro Muskel und Woche, wenn du der Rotation inkl. Erholungstagen folgst */
export function plannedWeeklySets(bonus: Bonus) {
  const extra = extraSetsMap(bonus)
  const items = strengthUnits().flatMap((u) =>
    u.exercises.map((ex, i) => ({ ex, sets: ((ex.sets + (extra.get(`${u.id}:${i}`) ?? 0)) * 7) / CYCLE_DAYS })),
  )
  return countSets(items)
}

export interface Occurrence {
  primary: MuscleGroup
  key: string
  date: string
  sets: SetRec[]
}

/** Muskeln, deren Übungen im Zeitraum zugelegt haben (bestes e1RM letzte > erste Einheit) */
export function progressedMuscles(occ: Occurrence[]): Set<MuscleGroup> {
  const byKey = new Map<string, Occurrence[]>()
  for (const o of occ) byKey.set(o.key, [...(byKey.get(o.key) ?? []), o])
  const out = new Set<MuscleGroup>()
  for (const list of byKey.values()) {
    if (list.length < 2) continue
    list.sort((a, b) => a.date.localeCompare(b.date))
    const best = (o: Occurrence) => Math.max(...o.sets.map(e1rm))
    if (best(list[list.length - 1]) > best(list[0])) out.add(list[0].primary)
  }
  return out
}

/** +1 Satz pro gewachsenem Muskel, solange das Wochenvolumen ≤ 20 bleibt */
export function increaseBonus(bonus: Bonus, progressed: Set<MuscleGroup>): Bonus {
  const next: Bonus = { ...bonus }
  for (const m of progressed) {
    const trial = { ...next, [m]: (next[m] ?? 0) + 1 }
    if ((plannedWeeklySets(trial)[m] ?? 0) <= MAX_WEEKLY_SETS) next[m] = trial[m]
  }
  return next
}
