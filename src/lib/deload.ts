// Entlastungswoche erkennen: Leistungsabfall bei Grundübungen.
import type { SetRec } from "./progression"

const total = (s: SetRec[]) => s.reduce((a, x) => a + x.reps, 0)
const topKg = (s: SetRec[]) => Math.max(...s.map((x) => x.kg))

/**
 * Wiederholungen sind bei gleicher Last zweimal nacheinander gefallen.
 * @param history Einheiten einer Übung, neueste zuerst.
 */
export function isDeclining(history: SetRec[][]): boolean {
  const [a, b, c] = history.filter((s) => s.length > 0)
  if (!a || !b || !c) return false
  if (topKg(a) !== topKg(b) || topKg(b) !== topKg(c)) return false
  return total(a) < total(b) && total(b) < total(c)
}

/** Mindestens 2 Grundübungen im Abwärtstrend → nächste Woche Entlastung */
export function needsDeload(compoundHistories: SetRec[][][]): boolean {
  return compoundHistories.filter(isDeclining).length >= 2
}

export const DELOAD_RIR: [number, number] = [3, 3]
export const deloadSets = (sets: number) => Math.ceil(sets / 2)
