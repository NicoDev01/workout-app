import Dexie, { type EntityTable } from "dexie"
import type { Mode, UnitId } from "@/data/plan"
import type { Bonus } from "./volume"
import type { HipType } from "@/data/hip"
import { DEFAULT_SLEEP_CONFIG, type SleepConfig, type SleepLog } from "@/data/sleep"

export interface Session {
  id?: number
  date: string
  unit: UnitId
  mode: Mode
  status: "active" | "done"
  startedAt: number
  endedAt?: number
  deload?: boolean
  reentry?: boolean
}

export interface SetRow {
  id?: number
  sessionId: number
  /** Variante, z. B. "gym:bench-press" */
  key: string
  /** Position der Übung in der Einheit */
  exIdx: number
  setNo: number
  kg: number
  reps: number
  rir?: number | null
  at: number
}

export interface BodyWeight {
  date: string
  kg: number
}

export interface Cardio {
  id?: number
  date: string
  kind: UnitId
  minutes: number
  sessionId?: number
}

/** Tagesprotokoll des Hüftprogramms */
export interface HipLog {
  date: string
  /** erledigte HipItem-IDs */
  done: string[]
  /** 0 = kein, 1 = selten, 2 = oft */
  snap?: 0 | 1 | 2
  pain?: boolean
}

export interface Settings {
  id: "app"
  dumbbellsHome: boolean
  notifications: boolean
  lastMode: Mode
  /** Montag der Entlastungswoche */
  deloadWeek?: string
  /** Montag der Wiedereinstiegswoche */
  reentryWeek?: string
  volumeBonus: Bonus
  volumeCheckedWeek?: string
  /** Getauschte Gym-Übungen: `${unitId}:${index}` → exId der Alternative */
  swaps: Record<string, string>
  /** Für den Altersvergleich */
  birthYear?: number
  /** Hüftprogramm, null = aus */
  hip: { type: HipType; since?: string } | null
  /** Einstellungen für die Schlafroutine */
  sleepConfig: SleepConfig
}

export const DEFAULT_SETTINGS: Settings = {
  id: "app",
  dumbbellsHome: false,
  notifications: true,
  lastMode: "gym",
  volumeBonus: {},
  swaps: {},
  hip: { type: "unknown" },
  sleepConfig: DEFAULT_SLEEP_CONFIG,
}

export const db = new Dexie("workout") as Dexie & {
  sessions: EntityTable<Session, "id">
  sets: EntityTable<SetRow, "id">
  bodyweight: EntityTable<BodyWeight, "date">
  cardio: EntityTable<Cardio, "id">
  settings: EntityTable<Settings, "id">
  hip: EntityTable<HipLog, "date">
  sleep: EntityTable<SleepLog, "date">
}

db.version(1).stores({
  sessions: "++id, date, status",
  sets: "++id, sessionId, key, at",
  bodyweight: "date",
  cardio: "++id, date",
  settings: "id",
})
db.version(2).stores({ hip: "date" })
db.version(3).stores({ sleep: "date" })

export async function getSettings(): Promise<Settings> {
  const raw = (await db.settings.get("app")) ?? ({} as Partial<Settings>)
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    sleepConfig: { ...DEFAULT_SLEEP_CONFIG, ...(raw.sleepConfig ?? {}) },
  }
}

export async function updateSettings(patch: Partial<Settings>) {
  const cur = await getSettings()
  await db.settings.put({ ...cur, ...patch, id: "app" })
}
