// Gewicht fürs nächste Mal (Regeln aus Plan v2, "Gewicht fürs nächste Mal").
import type { Load, Range } from "@/data/plan"

export interface SetRec {
  kg: number
  reps: number
  rir?: number | null
}

export const STEP: Record<Load, number> = {
  barbell: 2.5,
  dumbbell: 2,
  machine: 5,
  cable: 2.5,
  bodyweight: 2.5,
  rucksack: 2.5,
}

export const START_KG: Record<Load, number> = {
  barbell: 20,
  dumbbell: 10,
  machine: 20,
  cable: 10,
  bodyweight: 0,
  rucksack: 0,
}

export type Reason = "start" | "up1" | "up2" | "hold" | "reset" | "top"

export interface Target {
  kg: number
  reason: Reason
}

export function roundToStep(kg: number, step: number): number {
  return Math.max(0, Math.round(kg / step) * step)
}

const topKg = (s: SetRec[]) => Math.max(...s.map((x) => x.kg))
const missedLow = (s: SetRec[], lo: number) => s.some((x) => x.reps < lo)

/**
 * @param history Arbeitssätze früherer Einheiten dieser Übung, neueste zuerst.
 */
export function nextTarget(history: SetRec[][], range: Range, load: Load, noLoad = false, rir: Range = [1, 1]): Target {
  const sessions = history.filter((s) => s.length > 0)
  if (sessions.length === 0) return { kg: START_KG[load], reason: "start" }
  const [lo, hi] = range
  const step = STEP[load]
  const last = sessions[0]
  const kg = topKg(last)

  // Regel 4: unteren Rand zweimal in Folge (bei gleicher Last) verfehlt.
  const prev = sessions[1]
  if (prev && missedLow(last, lo) && missedLow(prev, lo) && topKg(prev) === kg && kg > 0) {
    return { kg: roundToStep(kg * 0.925, step), reason: "reset" }
  }
  if (missedLow(last, lo)) return { kg, reason: "hold" }

  const lastRir = last[last.length - 1].rir
  const allTop = last.every((x) => x.reps >= hi)
  if (noLoad) return { kg, reason: allTop ? "top" : "hold" }
  // Regel 3: letzter Satz mindestens 2 Wdh leichter als das Ziel-RIR (bei Ziel 2 genügt "3+" nur für +1 Stufe).
  if (lastRir != null && lastRir >= rir[1] + 2) return { kg: kg + 2 * step, reason: "up2" }
  if (lastRir != null && lastRir >= 3) return { kg: kg + step, reason: "up1" }
  // Regel 1 (und 5 für Home): alle Sätze am oberen Ende.
  if (allTop) return { kg: kg + step, reason: "up1" }
  // Regel 2: Wiederholungen steigen lassen, Last halten.
  return { kg, reason: "hold" }
}

/** Vorschlag für die Wiederholungen eines Satzes */
export function suggestReps(history: SetRec[][], setIdx: number, targetKg: number, range: Range): number {
  const last = history.find((s) => s.length > 0)
  const [lo, hi] = range
  if (!last || topKg(last) !== targetKg) return lo
  const r = last[Math.min(setIdx, last.length - 1)].reps
  return Math.min(hi, Math.max(lo, r))
}

/** Epley-Schätzung des 1RM; ohne Last zählen die Wiederholungen */
export function e1rm(s: SetRec): number {
  if (s.kg <= 0) return s.reps
  return s.kg * (1 + s.reps / 30)
}

/** 1RM für Körpergewichtsübungen: Körpergewicht plus Zusatzlast */
export function e1rmBodyweight(s: SetRec, bodyKg: number): number {
  return (bodyKg + s.kg) * (1 + s.reps / 30)
}

/**
 * Last für den Zielbereich aus einem gemachten Satz schätzen.
 * Wiederholungen + RIR ergeben die Wiederholungen bis zum Versagen, daraus das 1RM (Epley).
 */
export function loadFor(set: SetRec, range: Range, rir: Range, load: Load): number {
  const toFailure = set.reps + (set.rir ?? 0)
  const oneRm = set.kg * (1 + toFailure / 30)
  const goal = (range[0] + range[1]) / 2 + (rir[0] + rir[1]) / 2
  return roundToStep(oneRm / (1 + goal / 30), STEP[load])
}

/**
 * Gewicht für den nächsten Satz nachjustieren, oder null, wenn es passt.
 * Erstes Mal: immer kalibrieren. Danach nur, wenn der Satz klar außerhalb des Ziels lag.
 */
export function adjustNextSet(set: SetRec, range: Range, rir: Range, load: Load, firstTime: boolean): number | null {
  if (set.kg <= 0) return null
  const tooHard = set.reps < range[0]
  // Höchste Auswahl beim Eintragen ist "3+", darum höchstens 3 verlangen.
  const tooEasy = set.reps > range[1] + 1 || (set.rir != null && set.rir >= Math.min(3, rir[1] + 2))
  if (!firstTime && !tooHard && !tooEasy) return null
  // Ohne RIR-Angabe: zu schwer heißt Versagen, sonst Ziel-RIR annehmen.
  const assumed: SetRec = { ...set, rir: set.rir ?? (tooHard ? 0 : rir[1]) }
  const next = loadFor(assumed, range, rir, load)
  return Math.abs(next - set.kg) >= STEP[load] ? next : null
}

export function warmupSets(workKg: number, load: Load): { kg: number; reps: number }[] {
  const step = STEP[load]
  return [
    { kg: roundToStep(workKg * 0.5, step), reps: 8 },
    { kg: roundToStep(workKg * 0.75, step), reps: 4 },
  ]
}

export const REASON_TEXT: Record<Reason, string> = {
  start: "Startgewicht – passe es beim ersten Satz an",
  up1: "+1 Stufe: alle Sätze am oberen Ende",
  up2: "+2 Stufen: letzter Satz war zu leicht",
  hold: "Last halten, Wiederholungen steigern",
  reset: "−7,5 %: zweimal unteren Rand verfehlt",
  top: "Obergrenze erreicht – langsamer ausführen",
}
