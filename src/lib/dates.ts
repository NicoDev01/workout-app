// Lokale Kalendertage als "YYYY-MM-DD".

const pad = (n: number) => String(n).padStart(2, "0")

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO(now = new Date()): string {
  return toISO(now)
}

export function addDays(s: string, n: number): string {
  const d = fromISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** 0 = Montag … 6 = Sonntag */
export function weekdayIndex(s: string): number {
  return (fromISO(s).getDay() + 6) % 7
}

export function weekStart(s: string): string {
  return addDays(s, -weekdayIndex(s))
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000)
}

export const WEEKDAY_LONG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]
export const WEEKDAY_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]

export function formatDate(s: string): string {
  return fromISO(s).toLocaleDateString("de-DE", { day: "numeric", month: "long" })
}
