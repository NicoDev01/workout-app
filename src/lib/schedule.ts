// Welche Einheit heute dran ist: Push → Pull → Beine, danach ein Erholungstag (Cardio oder frei).
// Die Rotation hängt nicht am Wochentag. Verpasste Tage verschieben nichts, es geht einfach mit der nächsten Einheit weiter.
import { RECOVERY_CARDIO, ROTATION, UNITS, type CardioId, type StrengthId, type UnitId } from "@/data/plan"
import { addDays, daysBetween } from "./dates"

export interface DoneEntry {
  date: string
  unit: UnitId
}

export type TodayPlan =
  | { kind: "strength"; unit: StrengthId }
  | { kind: "recovery"; cardio: CardioId; next: StrengthId; cardioDone: boolean }
  | { kind: "done"; unit: StrengthId; next: StrengthId }

export const isStrength = (u: UnitId): u is StrengthId => UNITS[u].type === "strength"

export const after = (u: StrengthId): StrengthId => ROTATION[(ROTATION.indexOf(u) + 1) % ROTATION.length]

function strengthHistory(done: DoneEntry[]) {
  return done.filter((d): d is { date: string; unit: StrengthId } => isStrength(d.unit)).sort((a, b) => a.date.localeCompare(b.date))
}

export function todayPlan(today: string, done: DoneEntry[]): TodayPlan {
  const hist = strengthHistory(done).filter((d) => d.date <= today)
  const last = hist[hist.length - 1]
  const next = last ? after(last.unit) : ROTATION[0]
  if (last && last.date === today) return { kind: "done", unit: last.unit, next }
  const cardio = last ? RECOVERY_CARDIO[last.unit] : undefined
  if (last && cardio && daysBetween(last.date, today) === 1) {
    const cardioDone = done.some((d) => d.date === today && (d.unit === "zone2" || d.unit === "intervals"))
    return { kind: "recovery", cardio, next, cardioDone }
  }
  return { kind: "strength", unit: next }
}

export interface DayPreview {
  date: string
  /** null = Erholungstag */
  unit: StrengthId | null
  cardio?: CardioId
}

/** Vorschau der nächsten Tage, falls du dem Vorschlag folgst */
export function preview(today: string, done: DoneEntry[], days = 8): DayPreview[] {
  const out: DayPreview[] = []
  const p = todayPlan(today, done)
  let last: { date: string; unit: StrengthId }
  if (p.kind === "done") {
    last = { date: today, unit: p.unit }
  } else if (p.kind === "recovery") {
    out.push({ date: today, unit: null, cardio: p.cardio })
    last = { date: addDays(today, -1), unit: ROTATION[(ROTATION.indexOf(p.next) + ROTATION.length - 1) % ROTATION.length] }
  } else {
    out.push({ date: today, unit: p.unit })
    last = { date: today, unit: p.unit }
  }
  for (let d = addDays(today, 1); out.length < days; d = addDays(d, 1)) {
    const cardio = RECOVERY_CARDIO[last.unit]
    if (cardio && daysBetween(last.date, d) === 1) {
      out.push({ date: d, unit: null, cardio })
      continue
    }
    const unit = after(last.unit)
    out.push({ date: d, unit })
    last = { date: d, unit }
  }
  return out
}

/** Wiedereinstieg nach 7+ Tagen ohne Training */
export function isReentry(lastSessionDate: string | null, today: string): boolean {
  if (!lastSessionDate) return false
  return daysBetween(lastSessionDate, today) >= 7
}
