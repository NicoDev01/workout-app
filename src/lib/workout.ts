// Verbindet Plan, Datenbank und Regeln: baut die heutige Einheit und wertet abgeschlossene aus.
import exercisesJson from "@/data/exercises.json"
import { STRENGTH_UNITS, UNITS, type Mode, type PlanExercise, type Range, type UnitId, type Variant } from "@/data/plan"
import { HIP_RISK } from "@/data/hip"
import { addDays, daysBetween, todayISO, weekStart } from "./dates"
import { db, getSettings, updateSettings, type Session, type Settings } from "./db"
import { DELOAD_RIR, deloadSets, needsDeload } from "./deload"
import { e1rm, nextTarget, roundToStep, STEP, type SetRec, type Target } from "./progression"
import { isReentry, type DoneEntry } from "./schedule"
import { extraSetsMap, increaseBonus, progressedMuscles, type Occurrence } from "./volume"

export interface ExerciseInfo {
  id: string
  name: string
  primary: string[]
  secondary: string[]
  tips: string[]
  instructions: string[]
  images: string[]
  source: string
}

export const EXERCISES = exercisesJson as Record<string, ExerciseInfo>

export function imageUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path}`
}

export interface WorkoutExercise {
  idx: number
  plan: PlanExercise
  variant: Variant
  key: string
  info: ExerciseInfo
  sets: number
  reps: Range
  rir: Range
  rest: number
  target: Target
  history: SetRec[][]
}

/**
 * @param hipSafe Hüftprogramm aktiv (Typ vorne oder unklar): Bauchübungen mit viel Hüftbeugung
 * werden durch Dead Bug ersetzt, solange du nicht selbst getauscht hast.
 */
export function resolveVariant(ex: PlanExercise, mode: Mode, dumbbellsHome: boolean, swapId?: string, hipSafe = false) {
  const safe = hipSafe && !swapId && ex.alts?.find((a) => a.exId === "dead-bug")
  const base = mode === "gym" ? ex.gym : ex.home
  if (safe && HIP_RISK[base.exId]?.types.includes("internal")) {
    return { variant: safe, key: `${mode === "gym" ? "gym" : "home"}:${safe.exId}`, reps: safe.reps ?? ex.reps }
  }
  if (mode === "gym") {
    const v = (swapId && ex.alts?.find((a) => a.exId === swapId)) || ex.gym
    return { variant: v, key: `gym:${v.exId}`, reps: v.reps ?? ex.reps }
  }
  if (dumbbellsHome && ex.homeDb) return { variant: ex.homeDb, key: `home-kh:${ex.homeDb.exId}`, reps: ex.homeDb.reps ?? ex.reps }
  return { variant: ex.home, key: `home:${ex.home.exId}`, reps: ex.home.reps ?? ex.reps }
}

/** Abgeschlossene Einheiten (ohne Entlastung), neueste zuerst, je Variante gruppiert */
export async function historyFor(key: string, excludeSessionId?: number): Promise<SetRec[][]> {
  const rows = await db.sets.where("key").equals(key).toArray()
  const sessionIds = [...new Set(rows.map((r) => r.sessionId))].filter((id) => id !== excludeSessionId)
  const sessions = (await db.sessions.bulkGet(sessionIds)).filter((s): s is Session => !!s && s.status === "done" && !s.deload)
  sessions.sort((a, b) => b.startedAt - a.startedAt)
  return sessions.map((s) =>
    rows
      .filter((r) => r.sessionId === s.id)
      .sort((a, b) => a.setNo - b.setNo)
      .map((r) => ({ kg: r.kg, reps: r.reps, rir: r.rir })),
  )
}

export interface WeekFlags {
  deload: boolean
  reentry: boolean
}

export async function weekFlags(date: string, settings?: Settings): Promise<WeekFlags> {
  const s = settings ?? (await getSettings())
  const monday = weekStart(date)
  let reentry = s.reentryWeek === monday
  if (!reentry) {
    const last = await db.sessions.where("status").equals("done").filter((x) => x.date < date).reverse().sortBy("date")
    reentry = isReentry(last[0]?.date ?? null, date)
  }
  return { deload: s.deloadWeek === monday, reentry }
}

export async function buildWorkout(unitId: UnitId, mode: Mode, date: string, excludeSessionId?: number): Promise<WorkoutExercise[]> {
  const unit = UNITS[unitId]
  if (unit.type !== "strength") return []
  const settings = await getSettings()
  const flags = await weekFlags(date, settings)
  const extra = flags.deload ? new Map<string, number>() : extraSetsMap(settings.volumeBonus)

  return Promise.all(
    unit.exercises.map(async (ex, idx) => {
      const { variant, key, reps } = resolveVariant(ex, mode, settings.dumbbellsHome, settings.swaps[`${unitId}:${idx}`], !!settings.hip && settings.hip.type !== "external")
      const history = await historyFor(key, excludeSessionId)
      let target = nextTarget(history, reps, variant.load, variant.noLoad, ex.rir)
      if (flags.reentry && target.kg > 0) target = { ...target, kg: roundToStep(target.kg * 0.9, STEP[variant.load]) }
      const baseSets = ex.sets + (extra.get(`${unitId}:${idx}`) ?? 0)
      return {
        idx,
        plan: ex,
        variant,
        key,
        info: EXERCISES[variant.exId],
        sets: flags.deload ? deloadSets(baseSets) : baseSets,
        reps,
        rir: flags.deload ? DELOAD_RIR : ex.rir,
        rest: ex.rest,
        target,
        history,
      }
    }),
  )
}

/**
 * Workout einer laufenden Session. Übungen mit geloggten Sätzen behalten ihre Variante,
 * der Rest folgt dem aktuellen Modus. So lassen sich Gym und Home mischen.
 */
export async function buildSessionWorkout(session: Session): Promise<WorkoutExercise[]> {
  const id = session.id!
  const [logged, gym, home] = await Promise.all([
    db.sets.where("sessionId").equals(id).toArray(),
    buildWorkout(session.unit, "gym", session.date, id),
    buildWorkout(session.unit, "home", session.date, id),
  ])
  const want = session.mode === "gym" ? gym : home
  const other = session.mode === "gym" ? home : gym
  return want.map((w, i) => {
    const key = logged.find((s) => s.exIdx === i)?.key
    return key && key !== w.key && other[i]?.key === key ? other[i] : w
  })
}

/** Abgeschlossene Einheit wieder aufnehmen */
export async function reopenSession(id: number) {
  await db.sessions.update(id, { status: "active", endedAt: undefined })
}

export async function setSessionMode(id: number, mode: Mode) {
  await db.sessions.update(id, { mode })
  await updateSettings({ lastMode: mode })
}

export async function doneEntries(): Promise<DoneEntry[]> {
  const s = await db.sessions.where("status").equals("done").toArray()
  return s.map((x) => ({ date: x.date, unit: x.unit }))
}

export async function startSession(unit: UnitId, mode: Mode): Promise<number> {
  const date = todayISO()
  const flags = await weekFlags(date)
  if (flags.reentry) await updateSettings({ reentryWeek: weekStart(date) })
  await updateSettings({ lastMode: mode })
  return (await db.sessions.add({
    date,
    unit,
    mode,
    status: "active",
    startedAt: Date.now(),
    deload: flags.deload,
    reentry: flags.reentry,
  })) as number
}

export interface Summary {
  minutes: number
  volumeKg: number
  sets: number
  records: string[]
  deloadScheduled: boolean
}

export async function finishSession(sessionId: number, cardioMinutes?: number): Promise<Summary> {
  const session = await db.sessions.get(sessionId)
  if (!session) throw new Error("Session fehlt")
  const endedAt = Date.now()
  await db.sessions.update(sessionId, { status: "done", endedAt })
  const unit = UNITS[session.unit]
  const minutes = Math.round((endedAt - session.startedAt) / 60_000)

  if (unit.type === "cardio") {
    await db.cardio.add({ date: session.date, kind: session.unit, minutes: cardioMinutes ?? minutes, sessionId })
    return { minutes: cardioMinutes ?? minutes, volumeKg: 0, sets: 0, records: [], deloadScheduled: false }
  }

  const rows = await db.sets.where("sessionId").equals(sessionId).toArray()
  const records: string[] = []
  for (const key of new Set(rows.map((r) => r.key))) {
    const mine = rows.filter((r) => r.key === key)
    const prior = (await historyFor(key, sessionId)).flat()
    if (prior.length === 0 || session.deload) continue
    const best = Math.max(...mine.map(e1rm))
    if (best > Math.max(...prior.map(e1rm))) records.push(variantName(key))
  }
  const deloadScheduled = await runRules(session.date)
  return {
    minutes,
    volumeKg: Math.round(rows.reduce((a, r) => a + r.kg * r.reps, 0)),
    sets: rows.length,
    records,
    deloadScheduled,
  }
}

/** Alle Varianten einer Planübung mit ihrem Datenbank-Schlüssel */
function variantsOf(ex: PlanExercise): { key: string; variant: Variant }[] {
  const out = [ex.gym, ...(ex.alts ?? [])].map((v) => ({ key: `gym:${v.exId}`, variant: v }))
  out.push({ key: `home:${ex.home.exId}`, variant: ex.home })
  if (ex.homeDb) out.push({ key: `home-kh:${ex.homeDb.exId}`, variant: ex.homeDb })
  return out
}

export function primaryByKey(): Map<string, PlanExercise> {
  const map = new Map<string, PlanExercise>()
  for (const u of STRENGTH_UNITS) for (const ex of u.exercises) for (const { key } of variantsOf(ex)) if (!map.has(key)) map.set(key, ex)
  return map
}

const NAMES = new Map<string, Variant>()
for (const u of STRENGTH_UNITS) for (const ex of u.exercises) for (const { key, variant } of variantsOf(ex)) if (!NAMES.has(key)) NAMES.set(key, variant)

export const variantByKey = (key: string) => NAMES.get(key)
export const variantName = (key: string) => NAMES.get(key)?.name ?? key

/** Gym-Übung durch eine Alternative ersetzen (null = Standard) */
export async function setSwap(unitId: UnitId, idx: number, exId: string | null) {
  const { swaps } = await getSettings()
  const next = { ...swaps }
  const k = `${unitId}:${idx}`
  if (exId) next[k] = exId
  else delete next[k]
  await updateSettings({ swaps: next })
}

/** Entlastung und Volumen prüfen. Gibt true zurück, wenn gerade eine Entlastungswoche geplant wurde. */
export async function runRules(today: string): Promise<boolean> {
  const s = await getSettings()
  const monday = weekStart(today)
  const byKey = primaryByKey()
  let scheduled = false

  const deloadPending = s.deloadWeek !== undefined && s.deloadWeek >= monday
  if (!deloadPending) {
    const compoundKeys = [...byKey.entries()].filter(([, ex]) => ex.rest >= 120).map(([k]) => k)
    const histories = await Promise.all(compoundKeys.map((k) => historyFor(k)))
    if (needsDeload(histories)) {
      const next = addDays(monday, 7)
      // Nach der Entlastung startet das Volumen wieder beim Ausgangswert.
      await updateSettings({ deloadWeek: next, volumeBonus: {}, volumeCheckedWeek: addDays(next, 7) })
      scheduled = true
    }
  }

  if (!scheduled) {
    if (!s.volumeCheckedWeek) {
      await updateSettings({ volumeCheckedWeek: monday })
    } else if (daysBetween(s.volumeCheckedWeek, monday) >= 14) {
      const from = addDays(monday, -14)
      const sessions = await db.sessions
        .where("date")
        .between(from, monday, true, false)
        .filter((x) => x.status === "done" && !x.deload)
        .toArray()
      const occ: Occurrence[] = []
      for (const sess of sessions) {
        const rows = await db.sets.where("sessionId").equals(sess.id!).toArray()
        for (const key of new Set(rows.map((r) => r.key))) {
          const ex = byKey.get(key)
          if (ex) occ.push({ primary: ex.primary, key, date: sess.date, sets: rows.filter((r) => r.key === key) })
        }
      }
      await updateSettings({ volumeBonus: increaseBonus(s.volumeBonus, progressedMuscles(occ)), volumeCheckedWeek: monday })
    }
  }
  return scheduled
}

export async function activeSession(): Promise<Session | undefined> {
  return db.sessions.where("status").equals("active").first()
}

export async function discardSession(id: number) {
  await db.transaction("rw", db.sessions, db.sets, async () => {
    await db.sets.where("sessionId").equals(id).delete()
    await db.sessions.delete(id)
  })
}
