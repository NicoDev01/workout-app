import { useEffect, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import {
  ActivityIcon,
  CheckIcon,
  ChevronRightIcon,
  DumbbellIcon,
  FastForwardIcon,
  RotateCcwIcon,
  HomeIcon,
  PlayIcon,
  Building2Icon,
  MoveRightIcon,
} from "lucide-react"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Pills, PoseLoop, fmtKg } from "@/components/bits"
import { BodyWeightButton } from "@/components/BodyWeightDrawer"
import { HipCard } from "@/components/HipCard"
import { hipItemsFor } from "@/data/hip"
import {
  ROTATION,
  UNITS,
  type Mode,
  type StrengthId,
  type UnitId,
} from "@/data/plan"
import { WEEKDAY_LONG, formatDate, todayISO, weekdayIndex } from "@/lib/dates"
import { db, getSettings, DEFAULT_SETTINGS } from "@/lib/db"
import { preview, todayPlan, type DayPreview } from "@/lib/schedule"
import { tap } from "@/lib/native"
import { cn } from "@/lib/utils"
import {
  EXERCISES,
  buildWorkout,
  reopenSession,
  setSessionMode,
  weekFlags,
  startSession,
  type WorkoutExercise,
  type WeekFlags,
} from "@/lib/workout"

export function Today({
  onStart,
}: {
  onStart: (sessionId: number, exIdx?: number) => void
}) {
  const today = todayISO()
  const sessions = useLiveQuery(() => db.sessions.toArray(), [])
  const settings = useLiveQuery(() => getSettings(), []) ?? DEFAULT_SETTINGS
  const [mode, setMode] = useState<Mode | null>(null)
  const [skipRest, setSkipRest] = useState(false)
  const [pullForward, setPullForward] = useState(false)
  const [view, setView] = useState<"train" | "hip">("train")
  const hipLog = useLiveQuery(() => db.hip.get(today), [today])
  const done = (sessions ?? [])
    .filter((s) => s.status === "done")
    .map((s) => ({ date: s.date, unit: s.unit }))
  const plan = todayPlan(today, done)
  const active = sessions?.find((s) => s.status === "active")
  const currentMode = active?.mode ?? mode ?? settings.lastMode
  const planned: UnitId | null =
    plan.kind === "strength"
      ? plan.unit
      : plan.kind === "recovery"
        ? skipRest
          ? plan.next
          : plan.cardioDone
            ? null
            : plan.cardio
        : pullForward
          ? plan.next
          : null
  const unitId: UnitId | null = active?.unit ?? planned
  const unit = unitId ? UNITS[unitId] : null
  const upcoming = preview(today, done, 8)
  const lastToday = (sessions ?? [])
    .filter(
      (s) =>
        s.date === today &&
        s.status === "done" &&
        UNITS[s.unit].type === "strength"
    )
    .at(-1)

  const [workout, setWorkout] = useState<WorkoutExercise[]>([])
  const [flags, setFlags] = useState<WeekFlags>({
    deload: false,
    reentry: false,
  })
  const doneCount = done.length
  useEffect(() => {
    let alive = true
    if (unitId)
      void buildWorkout(unitId, currentMode, today).then(
        (w) => alive && setWorkout(w)
      )
    void weekFlags(today).then((f) => alive && setFlags(f))
    return () => {
      alive = false
    }
  }, [
    unitId,
    currentMode,
    today,
    doneCount,
    settings.dumbbellsHome,
    settings.volumeBonus,
    settings.deloadWeek,
    settings.swaps,
  ])

  const start = async (exIdx?: number) => {
    tap()
    if (active) return onStart(active.id!, exIdx)
    if (!unitId) return
    onStart(await startSession(unitId, currentMode), exIdx)
  }

  const nextAfterToday = upcoming.find((d) => d.date > today)
  const nextLabel = nextAfterToday
    ? nextAfterToday.unit
      ? UNITS[nextAfterToday.unit].name
      : "Erholungstag"
    : null
  const isRecovery = plan.kind === "recovery" && !skipRest && !active
  // Einheit, nach der sich das Hüftprogramm richtet (null = Ruhetag)
  const hipUnit: UnitId | null =
    active?.unit ??
    (plan.kind === "recovery" ? (skipRest ? plan.next : null) : plan.unit)
  const hip = settings.hip ? (
    <HipCard date={today} unit={hipUnit} type={settings.hip.type} />
  ) : null
  const hipItems = settings.hip ? hipItemsFor(hipUnit, settings.hip.type) : []
  const hipOpen = hipItems.filter((i) => !hipLog?.done.includes(i.id))
  const activationOpen = hipOpen.filter((i) => i.block === "activation")
  const showHip = !!hip && view === "hip"

  return (
    <div className="pt-safe flex flex-col gap-5 px-4 pb-48">
      <header className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {WEEKDAY_LONG[weekdayIndex(today)]}, {formatDate(today)}
        </div>
        <BodyWeightButton />
      </header>

      {!unit ? (
        <>
          <Card className="items-center gap-3 bg-primary px-6 py-10 text-center text-primary-foreground">
            <div className="flex size-16 items-center justify-center rounded-full bg-white/20">
              <CheckIcon className="size-9" strokeWidth={3} />
            </div>
            <div className="text-4xl font-bold">
              {plan.kind === "done" ? UNITS[plan.unit].name : "Erholungstag"}
            </div>
            <div className="text-sm opacity-90">Heute erledigt</div>
            {nextLabel && (
              <div className="mt-2 flex items-center gap-2 text-sm font-medium opacity-90">
                Morgen <MoveRightIcon className="size-4" /> {nextLabel}
              </div>
            )}
          </Card>
          <div className="flex gap-2">
            {lastToday && (
              <Button
                variant="secondary"
                size="lg"
                className="h-12 flex-1 rounded-full bg-card text-sm"
                onClick={() =>
                  void reopenSession(lastToday.id!).then(() =>
                    onStart(lastToday.id!)
                  )
                }
              >
                <RotateCcwIcon /> Weiter trainieren
              </Button>
            )}
            {plan.kind === "done" && (
              <Button
                variant="secondary"
                size="lg"
                className="h-12 flex-1 rounded-full bg-card text-sm"
                onClick={() => setPullForward(true)}
              >
                <FastForwardIcon /> {UNITS[plan.next].name} vorziehen
              </Button>
            )}
          </div>
          {hip}
          <NextDays days={upcoming.filter((d) => d.date > today)} />
        </>
      ) : (
        <>
          <section>
            {isRecovery && (
              <div className="mb-1 text-sm font-semibold text-primary">
                Erholungstag
              </div>
            )}
            <h1 className="text-[3.25rem] leading-none font-bold tracking-tight">
              {unit.name}
            </h1>
            {unit.type === "strength" && <BlockDots unit={unit.id} />}
            {(flags.deload || flags.reentry) && unit.type === "strength" && (
              <div className="mt-3 rounded-2xl bg-primary-soft px-4 py-3 text-sm">
                {flags.deload
                  ? "Entlastungswoche: halbe Sätze, RIR 3. Danach geht es normal weiter."
                  : "Wiedereinstieg nach Pause: diese Woche −10 % Last."}
              </div>
            )}
          </section>

          {hip && (
            <Pills
              value={view}
              onChange={(v) => {
                tap()
                setView(v)
              }}
              options={[
                {
                  value: "train",
                  label: (
                    <>
                      <DumbbellIcon className="size-4" />{" "}
                      {unit.type === "strength" ? "Muskelaufbau" : "Training"}
                    </>
                  ),
                },
                {
                  value: "hip",
                  label: (
                    <>
                      <ActivityIcon className="size-4" /> Hüfte
                      {hipOpen.length > 0 ? (
                        <span
                          className={cn(
                            "num rounded-full px-1.5 text-[11px] leading-4",
                            view === "hip"
                              ? "bg-white/25"
                              : "bg-primary text-primary-foreground"
                          )}
                        >
                          {hipOpen.length}
                        </span>
                      ) : (
                        <CheckIcon className="size-4" strokeWidth={3} />
                      )}
                    </>
                  ),
                },
              ]}
            />
          )}

          {showHip ? (
            hip
          ) : (
            <>
              <Pills
                value={currentMode}
                onChange={(m) =>
                  active ? void setSessionMode(active.id!, m) : setMode(m)
                }
                options={[
                  {
                    value: "gym",
                    label: (
                      <>
                        <Building2Icon className="size-4" /> Gym
                      </>
                    ),
                  },
                  {
                    value: "home",
                    label: (
                      <>
                        <HomeIcon className="size-4" /> Home
                      </>
                    ),
                  },
                ]}
              />

              {activationOpen.length > 0 && !active && (
                <button
                  onClick={() => setView("hip")}
                  className="flex items-center gap-3 rounded-3xl bg-primary-soft px-4 py-3 text-left text-sm active:scale-[0.98]"
                >
                  <ActivityIcon className="size-5 shrink-0 text-primary" />
                  <span className="flex-1">
                    <span className="font-semibold">
                      Vorher: Hüft-Aktivierung
                    </span>
                    , {activationOpen.length} Übungen, ca. 4 min
                  </span>
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                </button>
              )}

              {unit.type === "strength" ? (
                <div className="flex flex-col gap-2.5">
                  {workout.map((w) => (
                    <ExerciseRow
                      key={w.idx}
                      w={w}
                      onClick={() => void start(w.idx)}
                    />
                  ))}
                </div>
              ) : (
                <Card className="gap-4 p-4">
                  <PoseLoop
                    info={EXERCISES[unit[currentMode].exId]}
                    className="rounded-3xl"
                  />
                  <div className="px-1">
                    <div className="text-lg font-semibold">
                      {unit[currentMode].text}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {unit.description}
                    </p>
                  </div>
                </Card>
              )}

              {isRecovery && plan.kind === "recovery" && (
                <Card className="gap-3 px-5 py-4">
                  <p className="text-sm text-muted-foreground">
                    Nach Push, Pull und Beine liegen bis zum nächsten Training
                    desselben Muskels 3–4 Tage. Cardio oder ein freier Tag passt
                    hier. Fühlst du dich fit, geht es direkt weiter.
                  </p>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="h-12 bg-background text-base"
                    onClick={() => setSkipRest(true)}
                  >
                    Direkt weiter mit {UNITS[plan.next].name}
                  </Button>
                </Card>
              )}

              <Button
                size="lg"
                className="fixed inset-x-4 bottom-[calc(var(--sab)+5.5rem)] z-30 mx-auto h-16 max-w-md rounded-full text-lg font-semibold"
                onClick={() => void start()}
              >
                <PlayIcon className="size-5 fill-current" />
                {active ? "Fortsetzen" : "Start"}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  )
}

function BlockDots({ unit }: { unit: StrengthId }) {
  const idx = ROTATION.indexOf(unit)
  const block = idx < 3 ? ROTATION.slice(0, 3) : ROTATION.slice(3, 6)
  return (
    <div className="mt-3 flex items-center gap-1.5">
      {block.map((u) => (
        <span
          key={u}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            u === unit
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground"
          )}
        >
          {UNITS[u].name}
        </span>
      ))}
    </div>
  )
}

function NextDays({ days }: { days: DayPreview[] }) {
  if (!days.length) return null
  return (
    <Card className="gap-2 px-5 py-4">
      <div className="text-xs font-medium text-muted-foreground uppercase">
        Nächste Tage
      </div>
      {days.slice(0, 5).map((d) => (
        <div key={d.date} className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {WEEKDAY_LONG[weekdayIndex(d.date)]}
          </span>
          <span className="font-medium">
            {d.unit
              ? UNITS[d.unit].name
              : `Erholung · ${UNITS[d.cardio!].name}`}
          </span>
        </div>
      ))}
    </Card>
  )
}

function ExerciseRow({
  w,
  onClick,
}: {
  w: WorkoutExercise
  onClick: () => void
}) {
  const showKg =
    !w.variant.noLoad && (w.variant.load !== "rucksack" || w.target.kg > 0)
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex items-center gap-3 rounded-4xl bg-card p-2.5 text-left"
    >
      <PoseLoop info={w.info} still className="size-16 shrink-0 rounded-2xl" />
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 leading-tight font-semibold">
          {w.variant.name}
        </div>
        <div className="num text-sm text-muted-foreground">
          {w.sets} × {w.reps[0]}–{w.reps[1]}
          {w.plan.perSide && " je Seite"}
        </div>
      </div>
      {showKg && (
        <div className="pr-2 text-right">
          <span className="num text-xl font-bold">{fmtKg(w.target.kg)}</span>
          <span className="ml-0.5 text-xs text-muted-foreground">kg</span>
        </div>
      )}
      <ChevronRightIcon className="mr-1 size-4 shrink-0 text-muted-foreground/60" />
    </motion.button>
  )
}
