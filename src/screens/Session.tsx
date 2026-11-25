import { useEffect, useMemo, useRef, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { ArrowLeftRightIcon, BikeIcon, Building2Icon, CheckIcon, ChevronDownIcon, HomeIcon, ChevronLeftIcon, ChevronRightIcon, TrophyIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { MuscleMap, Pills, PoseLoop, Stepper, Stat, fmtKg } from "@/components/bits"
import { UNITS } from "@/data/plan"
import { HIP_RISK } from "@/data/hip"
import { db, getSettings, type Session as SessionRow } from "@/lib/db"
import { REASON_TEXT, STEP, adjustNextSet, suggestReps, warmupSets } from "@/lib/progression"
import { formatClock, remainingMs } from "@/lib/timer"
import { alarm, cancelRestEnd, isNative, keepAwake, scheduleRestEnd, tap } from "@/lib/native"
import { EXERCISES, buildSessionWorkout, discardSession, finishSession, setSessionMode, setSwap, startSession, type Summary, type WorkoutExercise } from "@/lib/workout"
import { useNow } from "@/hooks/useNow"
import { cn } from "@/lib/utils"
import { CardioSession } from "./CardioSession"

interface Rest {
  endAt: number
  total: number
  label: string
}

const restKey = (id: number) => `rest:${id}`
const now = () => Date.now()

export function Session({ sessionId, startIdx, onClose, onSwitch }: { sessionId: number; startIdx?: number; onClose: () => void; onSwitch: (id: number) => void }) {
  const session = useLiveQuery(() => db.sessions.get(sessionId), [sessionId])
  useEffect(() => {
    void keepAwake(true)
    return () => void keepAwake(false)
  }, [])
  if (!session) return <div className="fixed inset-0 z-50 bg-background" />
  return UNITS[session.unit].type === "cardio" ? (
    <CardioSession session={session} onClose={onClose} />
  ) : (
    <StrengthSession session={session} startIdx={startIdx} onClose={onClose} onSwitch={onSwitch} />
  )
}

function StrengthSession({ session, startIdx, onClose, onSwitch }: { session: SessionRow; startIdx?: number; onClose: () => void; onSwitch: (id: number) => void }) {
  const hipType = useLiveQuery(() => getSettings().then((s) => s.hip?.type ?? null), [])
  const sessionId = session.id!
  const sets = useLiveQuery(() => db.sets.where("sessionId").equals(sessionId).sortBy("at"), [sessionId]) ?? []
  const [workout, setWorkout] = useState<WorkoutExercise[] | null>(null)
  const [exIdx, setExIdx] = useState(0)
  const [kgByEx, setKgByEx] = useState<Record<number, number>>({})
  const [rest, setRest] = useState<Rest | null>(() => {
    try {
      const r = JSON.parse(localStorage.getItem(restKey(sessionId)) ?? "null") as Rest | null
      return r && r.endAt > Date.now() ? r : null
    } catch {
      return null
    }
  })
  const [summary, setSummary] = useState<Summary | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notify, setNotify] = useState(true)
  const [swapOpen, setSwapOpen] = useState(false)

  const initialized = useRef(false)
  useEffect(() => {
    void getSettings().then((s) => setNotify(s.notifications))
  }, [])
  useEffect(() => {
    void buildSessionWorkout(session).then(async (w) => {
      if (initialized.current) return setWorkout(w)
      initialized.current = true
      // Angetippte Übung, sonst beim Fortsetzen die erste offene Übung.
      const logged = await db.sets.where("sessionId").equals(sessionId).toArray()
      const isOpen = (x: WorkoutExercise) => logged.filter((s) => s.exIdx === x.idx).length < x.sets
      const picked = w.find((x) => x.idx === startIdx && isOpen(x))
      const open = picked ?? w.find(isOpen)
      if (open) setExIdx(open.idx)
      setWorkout(w)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- neu bauen nur bei Modus- oder Einheitswechsel
  }, [session.unit, session.mode, session.date, sessionId, startIdx])

  const doneFor = (i: number) => sets.filter((s) => s.exIdx === i)
  const openSets = (workout ?? []).reduce((a, x) => a + Math.max(0, x.sets - doneFor(x.idx).length), 0)
  const isComplete = (w: WorkoutExercise) => doneFor(w.idx).length >= w.sets

  useEffect(() => {
    if (rest) localStorage.setItem(restKey(sessionId), JSON.stringify(rest))
    else localStorage.removeItem(restKey(sessionId))
  }, [rest, sessionId])

  if (summary)
    return (
      <SummaryView
        summary={summary}
        unitName={UNITS[session.unit].name}
        onClose={onClose}
        onCooldown={async () => onSwitch(await startSession("cooldown", session.mode))}
      />
    )
  if (!workout) return <div className="fixed inset-0 z-50 bg-background" />

  const w = workout[exIdx]
  const risk = HIP_RISK[w.variant.exId]
  const hipRisk = hipType && risk?.types.includes(hipType) ? risk : null
  const done = doneFor(exIdx)
  const lastLogged = done[done.length - 1]
  const kg = kgByEx[exIdx] ?? lastLogged?.kg ?? w.target.kg
  const setNo = done.length + 1
  const isLastSet = setNo >= w.sets
  const setKg = (v: number) => setKgByEx((m) => ({ ...m, [exIdx]: v }))

  const nextOpen = (from: number) => {
    for (let k = 1; k <= workout.length; k++) {
      const cand = workout[(from + k) % workout.length]
      if (!isComplete(cand) && !(cand.idx === from)) return cand
    }
    return null
  }

  const logSet = async (reps: number, rir: number | null) => {
    setConfirmOpen(false)
    tap(true)
    await db.sets.add({ sessionId, key: w.key, exIdx, setNo, kg, reps, rir, at: now() })
    const exerciseDone = setNo >= w.sets
    const next = exerciseDone ? nextOpen(exIdx) : w
    // Alles geschafft: nicht automatisch abschließen, sondern fragen.
    if (!next) return setMenuOpen(true)
    const nextSetNo = next.idx === exIdx ? setNo + 1 : doneFor(next.idx).length + 1
    let nextKg = next.idx === exIdx ? kg : (kgByEx[next.idx] ?? next.target.kg)
    if (next.idx === exIdx && !w.variant.noLoad) {
      const adj = adjustNextSet({ kg, reps, rir }, w.reps, w.rir, w.variant.load, w.history.length === 0)
      if (adj !== null) {
        nextKg = adj
        setKgByEx((m) => ({ ...m, [exIdx]: adj }))
        toast(`Nächster Satz: ${fmtKg(adj)} kg`, { description: adj > kg ? "Das war leichter als geplant." : "Das war schwerer als geplant." })
      }
    }
    const kgText = next.variant.noLoad || nextKg === 0 ? "" : ` · ${fmtKg(nextKg)} kg`
    const label = `${next.variant.name} · Satz ${nextSetNo}/${next.sets}${kgText}`
    const endAt = now() + w.rest * 1000
    setRest({ endAt, total: w.rest * 1000, label })
    if (notify) void scheduleRestEnd(endAt, label)
    setExIdx(next.idx)
  }

  const finish = async () => {
    setMenuOpen(false)
    setRest(null)
    void cancelRestEnd()
    const count = await db.sets.where("sessionId").equals(sessionId).count()
    if (count === 0) {
      await discardSession(sessionId)
      return onClose()
    }
    const s = await finishSession(sessionId)
    setSummary(s)
    if (s.records.length) toast.success(`Neuer Bestwert: ${s.records.join(", ")}`, { icon: <TrophyIcon className="size-4" /> })
    if (s.deloadScheduled) toast.info("Leistung fällt: nächste Woche ist Entlastung.")
  }

  const discard = async () => {
    setMenuOpen(false)
    void cancelRestEnd()
    localStorage.removeItem(restKey(sessionId))
    await discardSession(sessionId)
    onClose()
  }

  const prefillReps = done.length ? done[done.length - 1].reps : suggestReps(w.history, setNo - 1, kg, w.reps)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      {rest && (
        <RecoveryView
          rest={rest}
          onSkip={() => {
            setRest(null)
            void cancelRestEnd()
          }}
          onExtend={() => {
            const r = { ...rest, endAt: rest.endAt + 30_000, total: rest.total + 30_000 }
            setRest(r)
            if (notify) void scheduleRestEnd(r.endAt, r.label)
          }}
          onDone={() => {
            setRest(null)
            if (!isNative || !notify) alarm()
          }}
        />
      )}

      <div className="flex flex-col gap-4 px-4 pt-safe pb-36">
        <header className="flex items-center justify-between">
          <Button variant="secondary" size="icon-lg" className="rounded-full bg-card" onClick={onClose} aria-label="Minimieren, später fortsetzen">
            <ChevronDownIcon />
          </Button>
          <div className="flex flex-col items-center leading-tight">
            <span className="text-sm font-semibold">
              Übung <span className="num">{exIdx + 1}/{workout.length}</span>
            </span>
            <ElapsedClock startedAt={session.startedAt} />
          </div>
          <Button variant="secondary" className="h-11 rounded-full bg-card px-4 font-semibold" onClick={() => setMenuOpen(true)}>
            Beenden
          </Button>
        </header>

        <div className="relative">
          <PoseLoop info={w.info} className="rounded-4xl" />
          <div className="absolute right-3 bottom-3 w-24 rounded-2xl bg-white/90 p-1.5">
            <MuscleMap info={w.info} />
          </div>
        </div>

        <section>
          <h1 className="text-2xl leading-tight font-bold">{w.variant.name}</h1>
          <div className="num mt-1 text-base text-muted-foreground">
            {w.sets} × {w.reps[0]}–{w.reps[1]}
            {w.plan.perSide && " je Seite"} · RIR {w.rir[0] === w.rir[1] ? w.rir[0] : `${w.rir[0]}–${w.rir[1]}`}
          </div>
          {w.target.reason !== "hold" && w.target.reason !== "start" && <div className="mt-1 text-xs text-primary">{REASON_TEXT[w.target.reason]}</div>}
          {hipRisk && (
            <div className="mt-3 rounded-2xl bg-primary-soft px-4 py-3 text-sm">
              <span className="font-semibold">Hüfte: </span>
              {hipRisk.text} Schnappt oder schmerzt es trotzdem, Übung tauschen.
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {session.mode === "gym" && !!w.plan.alts?.length && done.length === 0 && (
              <button onClick={() => setSwapOpen(true)} className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-sm font-semibold active:scale-95">
                <ArrowLeftRightIcon className="size-4" /> Übung tauschen
              </button>
            )}
            <button
              onClick={() => {
                setKgByEx({})
                void setSessionMode(sessionId, session.mode === "gym" ? "home" : "gym")
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-sm font-semibold active:scale-95"
            >
              {session.mode === "gym" ? <HomeIcon className="size-4" /> : <Building2Icon className="size-4" />}
              {session.mode === "gym" ? "Ab hier zu Hause" : "Ab hier im Gym"}
            </button>
          </div>
        </section>

        {!w.variant.noLoad && (
          <Card className="gap-1 px-4 py-4">
            <div className="text-center text-xs text-muted-foreground">{w.variant.load === "rucksack" ? "kg im Rucksack" : "Gewicht"}</div>
            <Stepper value={kg} onChange={setKg} step={STEP[w.variant.load]} unit="kg" big />
          </Card>
        )}

        <SetDots total={w.sets} done={done.map((d) => ({ kg: d.kg, reps: d.reps }))} />

        {exIdx === 0 && done.length === 0 && <Warmup w={w} kg={kg} />}

        <Accordion>
          <AccordionItem value="tips">
            <AccordionTrigger className="text-base">Ausführung</AccordionTrigger>
            <AccordionContent>
              <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                {(w.info.tips.length ? w.info.tips : w.info.instructions.slice(0, 3)).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 flex items-center gap-2 bg-gradient-to-t from-background from-70% to-transparent px-4 pt-6 pb-safe">
        <Button variant="secondary" size="icon-lg" className="size-16 rounded-full bg-card" disabled={exIdx === 0} onClick={() => setExIdx(exIdx - 1)} aria-label="Vorherige Übung">
          <ChevronLeftIcon className="size-6" />
        </Button>
        <Button size="lg" className="h-16 flex-1 rounded-full text-lg font-semibold" disabled={isComplete(w)} onClick={() => setConfirmOpen(true)}>
          {isComplete(w) ? (
            <>
              <CheckIcon /> Übung fertig
            </>
          ) : (
            `Satz ${setNo} fertig`
          )}
        </Button>
        <Button variant="secondary" size="icon-lg" className="size-16 rounded-full bg-card" disabled={exIdx === workout.length - 1} onClick={() => setExIdx(exIdx + 1)} aria-label="Nächste Übung">
          <ChevronRightIcon className="size-6" />
        </Button>
      </div>

      <ConfirmSet
        key={`${exIdx}-${setNo}-${kg}`}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        w={w}
        kg={kg}
        askRir={isLastSet || setNo === 1}
        initialReps={prefillReps}
        onSave={logSet}
      />

      <SwapDrawer
        open={swapOpen}
        onOpenChange={setSwapOpen}
        w={w}
        onPick={async (exId) => {
          setSwapOpen(false)
          await setSwap(session.unit, exIdx, exId === w.plan.gym.exId ? null : exId)
          setKgByEx((m) => {
            const rest = { ...m }
            delete rest[exIdx]
            return rest
          })
          setWorkout(await buildSessionWorkout(session))
        }}
      />

      <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Einheit beenden?</DrawerTitle>
            <p className="text-sm text-muted-foreground">
              {openSets > 0 ? `Noch ${openSets} ${openSets === 1 ? "Satz" : "Sätze"} offen. ` : "Alle Sätze geschafft. "}
              Zum Pausieren einfach oben links minimieren.
            </p>
          </DrawerHeader>
          <DrawerFooter className="pt-4 pb-safe">
            <Button size="lg" className="h-14 text-base" onClick={() => setMenuOpen(false)}>
              Weiter trainieren
            </Button>
            <Button size="lg" variant="secondary" className="h-14 text-base" onClick={finish}>
              Als erledigt abschließen
            </Button>
            <Button size="lg" variant="ghost" className="h-14 text-base text-destructive" onClick={discard}>
              Verwerfen (nichts speichern)
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

function ElapsedClock({ startedAt }: { startedAt: number }) {
  const now = useNow(1000)
  return <div className="num text-xs text-muted-foreground">{formatClock(now - startedAt)}</div>
}

function SetDots({ total, done }: { total: number; done: { kg: number; reps: number }[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {Array.from({ length: total }, (_, i) => {
        const d = done[i]
        const current = i === done.length
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "num flex size-12 items-center justify-center rounded-full text-lg font-bold",
                d ? "bg-primary text-primary-foreground" : current ? "border-[3px] border-primary text-primary" : "bg-card text-muted-foreground",
              )}
            >
              {d ? d.reps : i + 1}
            </div>
            <div className="num h-4 text-[11px] text-muted-foreground">{d && d.kg > 0 ? `${fmtKg(d.kg)} kg` : ""}</div>
          </div>
        )
      })}
    </div>
  )
}

function Warmup({ w, kg }: { w: WorkoutExercise; kg: number }) {
  const [checked, setChecked] = useState<boolean[]>([false, false])
  const rows = kg > 0 && !w.variant.noLoad && w.variant.load !== "rucksack" ? warmupSets(kg, w.variant.load) : [
    { kg: 0, reps: 8 },
    { kg: 0, reps: 4 },
  ]
  return (
    <Card size="sm" className="gap-2 px-4">
      <div className="text-xs font-medium text-muted-foreground uppercase">Aufwärmen · zählt nicht</div>
      <div className="flex gap-2">
        {rows.map((r, i) => (
          <button
            key={i}
            onClick={() => setChecked((c) => c.map((x, j) => (j === i ? !x : x)))}
            className={cn(
              "num flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl text-sm font-semibold",
              checked[i] ? "bg-primary-soft text-foreground" : "bg-background",
            )}
          >
            {checked[i] && <CheckIcon className="size-4 text-primary" />}
            {r.kg > 0 ? `${fmtKg(r.kg)} kg × ${r.reps}` : `${r.reps} Wdh locker`}
          </button>
        ))}
      </div>
    </Card>
  )
}

function SwapDrawer({
  open,
  onOpenChange,
  w,
  onPick,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  w: WorkoutExercise
  onPick: (exId: string) => void
}) {
  const options = [w.plan.gym, ...(w.plan.alts ?? [])]
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Übung tauschen</DrawerTitle>
          <p className="text-sm text-muted-foreground">Trifft dieselben Muskeln. Die App merkt sich deine Wahl.</p>
        </DrawerHeader>
        <div className="flex flex-col gap-2 px-4 pb-safe">
          {options.map((v) => {
            const on = v.exId === w.variant.exId
            return (
              <button
                key={v.exId}
                onClick={() => (on ? onOpenChange(false) : onPick(v.exId))}
                className={cn("flex items-center gap-3 rounded-3xl p-2 text-left transition-transform active:scale-[0.98]", on ? "bg-primary-soft" : "bg-card")}
              >
                <PoseLoop info={EXERCISES[v.exId]} still className="size-14 shrink-0 rounded-2xl" />
                <span className="flex-1 font-semibold">{v.name}</span>
                {on && <CheckIcon className="mr-2 size-5 text-primary" />}
              </button>
            )
          })}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function ConfirmSet({
  open,
  onOpenChange,
  w,
  kg,
  askRir,
  initialReps,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  w: WorkoutExercise
  kg: number
  askRir: boolean
  initialReps: number
  onSave: (reps: number, rir: number | null) => void
}) {
  const [reps, setReps] = useState(initialReps)
  const [rir, setRir] = useState<string>(String(Math.min(3, w.rir[1])))
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            Wiederholungen{!w.variant.noLoad && kg > 0 && <span className="text-muted-foreground"> · {fmtKg(kg)} kg</span>}
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-6 px-6 py-6">
          <Stepper value={reps} onChange={setReps} step={1} big />
          {askRir && (
            <div className="flex flex-col gap-2">
              <div className="text-center text-sm text-muted-foreground">Wie viele Wdh wären noch gegangen? (RIR)</div>
              <Pills
                value={rir}
                onChange={setRir}
                className="w-full"
                options={[
                  { value: "0", label: "0" },
                  { value: "1", label: "1" },
                  { value: "2", label: "2" },
                  { value: "3", label: "3+" },
                ]}
              />
            </div>
          )}
        </div>
        <DrawerFooter className="pb-safe">
          <Button size="lg" className="h-16 rounded-full text-lg font-semibold" onClick={() => onSave(reps, askRir ? Number(rir) : null)}>
            Speichern
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function RecoveryView({ rest, onSkip, onExtend, onDone }: { rest: Rest; onSkip: () => void; onExtend: () => void; onDone: () => void }) {
  const now = useNow(200)
  const left = remainingMs(rest.endAt, now)
  const fired = useRef(false)
  useEffect(() => {
    if (left <= 0 && !fired.current) {
      fired.current = true
      onDone()
    }
  }, [left, onDone])
  const progress = rest.total > 0 ? left / rest.total : 0
  const R = 120
  const C = 2 * Math.PI * R
  return (
    <div className="fixed inset-0 z-20 flex flex-col items-center justify-between bg-background px-6 pt-safe pb-safe">
      <div className="pt-6 text-sm font-semibold text-muted-foreground uppercase">Pause</div>
      <div className="relative flex items-center justify-center">
        <svg width="280" height="280" viewBox="0 0 280 280" className="-rotate-90">
          <circle cx="140" cy="140" r={R} fill="none" stroke="var(--card)" strokeWidth="18" />
          <circle
            cx="140"
            cy="140"
            r={R}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            style={{ transition: "stroke-dashoffset 0.2s linear" }}
          />
        </svg>
        <div className="num absolute text-7xl font-bold">{formatClock(left)}</div>
      </div>
      <Card className="w-full items-center gap-1 px-5 py-4 text-center">
        <div className="text-xs text-muted-foreground uppercase">Als Nächstes</div>
        <div className="text-base font-semibold">{rest.label}</div>
      </Card>
      <div className="flex w-full gap-2">
        <Button variant="secondary" size="lg" className="h-16 rounded-full bg-card px-6 text-base" onClick={onExtend}>
          <PlusIcon /> 30 s
        </Button>
        <Button size="lg" className="h-16 flex-1 rounded-full text-lg font-semibold" onClick={onSkip}>
          Überspringen
        </Button>
      </div>
    </div>
  )
}

export function SummaryView({ summary, unitName, onClose, onCooldown }: { summary: Summary; unitName: string; onClose: () => void; onCooldown?: () => void }) {
  const stats = useMemo(
    () => [
      { value: summary.volumeKg.toLocaleString("de-DE"), unit: "kg", label: "bewegte Last" },
      { value: summary.sets, label: "Sätze" },
    ],
    [summary],
  )
  return (
    <div className="fixed inset-0 z-50 flex flex-col gap-4 overflow-y-auto bg-background px-4 pt-safe pb-safe">
      <div className="pt-8 text-center text-sm text-muted-foreground">{unitName} · abgehakt</div>
      <Card className="items-center gap-1 bg-primary py-10 text-primary-foreground">
        <div className="flex items-baseline gap-2">
          <span className="num text-8xl font-bold">{summary.minutes}</span>
          <span className="text-lg opacity-80">min</span>
        </div>
        <div className="text-sm opacity-90">Dauer</div>
      </Card>
      {summary.sets > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <Card key={s.label} className="px-5 py-5">
              <Stat value={s.value} unit={s.unit} label={s.label} />
            </Card>
          ))}
        </div>
      )}
      {summary.records.length > 0 && (
        <Card className="gap-2 px-5 py-5">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
            <TrophyIcon className="size-4 text-primary" /> Neue Bestwerte
          </div>
          {summary.records.map((r) => (
            <div key={r} className="font-semibold">
              {r}
            </div>
          ))}
        </Card>
      )}
      {summary.deloadScheduled && (
        <Card className="bg-primary-soft px-5 py-4 text-sm">Deine Leistung bei den Grundübungen fällt. Nächste Woche ist Entlastung: halbe Sätze, RIR 3.</Card>
      )}
      <div className="flex-1" />
      {onCooldown && (
        <Button variant="secondary" size="lg" className="h-14 rounded-full bg-card text-base" onClick={onCooldown}>
          <BikeIcon /> 15 min Ausklang (Zone 2)
        </Button>
      )}
      <Button size="lg" className="h-16 rounded-full text-lg font-semibold" onClick={onClose}>
        Fertig
      </Button>
    </div>
  )
}
