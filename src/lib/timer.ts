// Timer-Berechnungen über absolute Endzeiten, damit sie Hintergrund und Sperre überstehen.
import type { CardioPhase } from "@/data/plan"

export function remainingMs(endAt: number, now: number): number {
  return Math.max(0, endAt - now)
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

export interface TimedPhase extends CardioPhase {
  startAt: number
  endAt: number
}

export function timeline(phases: CardioPhase[], startAt: number): TimedPhase[] {
  let t = startAt
  return phases.map((p) => {
    const startAt = t
    t += p.minutes * 60_000
    return { ...p, startAt, endAt: t }
  })
}

/** Index der laufenden Phase, phases.length wenn alles vorbei ist */
export function phaseIndex(tl: TimedPhase[], now: number): number {
  const i = tl.findIndex((p) => now < p.endAt)
  return i === -1 ? tl.length : i
}

/** Pausenlänge aus dem Plan (Sekunden) als m:ss */
export function restLabel(sec: number): string {
  return formatClock(sec * 1000)
}
