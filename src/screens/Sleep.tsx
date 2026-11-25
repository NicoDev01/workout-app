import { useEffect, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { motion } from "motion/react"
import { BellIcon, CheckIcon, MinusIcon, MoonIcon, PlusIcon, SlidersHorizontalIcon } from "lucide-react"
import { toast } from "sonner"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Toggle } from "@/components/ui/toggle"
import { Pills, SPRING, Stepper } from "@/components/bits"
import type { UnitId } from "@/data/plan"
import {
  AWAKE_IN_BED,
  DAY_RULES,
  DEFAULT_SLEEP_CONFIG,
  MIN_SLEEP_HOURS,
  ONSET_LABEL,
  SLEEP_SOURCES,
  bedtimeFrom,
  buildSleepRoutine,
  isNight,
  nextSleepStep,
  shiftTime,
  shouldCompress,
  trainingAdviceFromSleep,
  type SleepConfig,
  type SleepLog,
  type SleepOnset,
  type SleepQuality,
  type SleepStep,
} from "@/data/sleep"
import { useNow } from "@/hooks/useNow"
import { addDays, todayISO } from "@/lib/dates"
import { DEFAULT_SETTINGS, db, getSettings, updateSettings } from "@/lib/db"
import { requestNotificationPermission, scheduleSleepRoutine, tap } from "@/lib/native"
import { todayPlan } from "@/lib/schedule"
import { cn } from "@/lib/utils"

async function patchSleepLog(date: string, patch: Partial<SleepLog>) {
  const cur = (await db.sleep.get(date)) ?? { date, done: [] }
  await db.sleep.put({ ...cur, ...patch, date })
}

async function toggleSleepStep(date: string, id: string) {
  const cur = (await db.sleep.get(date)) ?? { date, done: [] }
  const done = cur.done.includes(id) ? cur.done.filter((x) => x !== id) : [...cur.done, id]
  await db.sleep.put({ ...cur, done, date })
}

const fmtH = (v: number) => String(v).replace(".", ",")

function inText(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `in ${m} min`
  return m === 0 ? `in ${h} h` : `in ${h} h ${m} min`
}

export function Sleep() {
  const today = todayISO()
  const now = new Date(useNow(30_000))
  const nowMin = now.getHours() * 60 + now.getMinutes()

  const settings = useLiveQuery(() => getSettings(), []) ?? DEFAULT_SETTINGS
  const sessions = useLiveQuery(() => db.sessions.where("status").equals("done").toArray(), []) ?? []
  const log = useLiveQuery(() => db.sleep.get(today), [today])
  const recent = useLiveQuery(() => db.sleep.where("date").between(addDays(today, -13), today, true, true).toArray(), [today]) ?? []
  const [settingsOpen, setSettingsOpen] = useState(false)

  const config: SleepConfig = settings.sleepConfig ?? DEFAULT_SLEEP_CONFIG
  const plan = todayPlan(today, sessions.map((s) => ({ date: s.date, unit: s.unit })))
  const todayUnit: UnitId | null =
    plan.kind === "strength" ? plan.unit : plan.kind === "recovery" ? (plan.cardioDone ? null : plan.cardio) : plan.unit

  const steps = buildSleepRoutine(config, todayUnit)
  const next = nextSleepStep(steps, nowMin)
  const night = isNight(config, nowMin)
  const bedTime = bedtimeFrom(config.wakeTime, config.sleepHours)
  const doneIds = log?.done ?? []
  const advice = trainingAdviceFromSleep(log)
  const compress = shouldCompress(recent, config)

  const updateConfig = async (patch: Partial<SleepConfig>) => {
    const c = { ...config, ...patch }
    await updateSettings({ sleepConfig: c })
    await scheduleSleepRoutine(buildSleepRoutine(c, todayUnit), c.notifications)
  }

  useEffect(() => {
    void scheduleSleepRoutine(steps, config.notifications)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur bei geänderten Zeiten neu planen
  }, [config.wakeTime, config.sleepHours, config.notifications, todayUnit])

  const toggle = (id: string) => {
    tap(!doneIds.includes(id))
    void toggleSleepStep(today, id)
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-safe pb-32">
      <header className="flex items-end justify-between">
        <h1 className="text-[2.5rem] leading-none font-bold tracking-tight">Schlaf</h1>
        <button
          onClick={() => {
            tap()
            setSettingsOpen(true)
          }}
          className="flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-sm font-semibold active:scale-95"
        >
          <SlidersHorizontalIcon className="size-4" />
          <span className="num">
            {bedTime} – {config.wakeTime}
          </span>
        </button>
      </header>

      {night ? (
        <Card className="gap-3 bg-primary px-6 py-6 text-primary-foreground">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase opacity-80">
            <MoonIcon className="size-3.5" /> Wach im Bett?
          </div>
          <ol className="flex flex-col gap-2">
            {AWAKE_IN_BED.map((t, i) => (
              <li key={t} className="flex gap-3 text-sm leading-snug font-semibold">
                <span className="num opacity-70">{i + 1}.</span>
                {t}
              </li>
            ))}
          </ol>
        </Card>
      ) : (
        <Card className="gap-2 bg-primary px-6 py-6 text-primary-foreground">
          <div className="text-xs font-semibold uppercase opacity-80">Als Nächstes · {inText(next.inMinutes)}</div>
          <div className="flex items-baseline gap-3">
            <span className="num text-5xl leading-none font-bold">{next.step.time}</span>
          </div>
          <div className="text-lg leading-snug font-bold">{next.step.title}</div>
          <div className="text-sm opacity-90">{next.step.short}</div>
        </Card>
      )}

      {compress && (
        <Card className="gap-3 bg-primary-soft px-5 py-4">
          <p className="text-sm font-semibold">Du liegst oft lange wach. Bettzeit 30 min später, Aufstehzeit bleibt.</p>
          <Button
            className="h-11 rounded-full"
            onClick={async () => {
              await updateConfig({ sleepHours: config.sleepHours - 0.5, compressedAt: today })
              toast.success(`Neue Bettzeit ${bedtimeFrom(config.wakeTime, config.sleepHours - 0.5)}`)
            }}
          >
            Bettzeit {bedtimeFrom(config.wakeTime, config.sleepHours - 0.5)} übernehmen
          </Button>
        </Card>
      )}

      <Card className="gap-2 px-3 py-3">
        {steps.map((s) => (
          <StepRow key={s.id} step={s} done={doneIds.includes(s.id)} isNext={!night && next.step.id === s.id} onToggle={() => toggle(s.id)} />
        ))}
        <div className="flex flex-wrap gap-1.5 px-1 pt-1">
          {DAY_RULES.map((r) => (
            <span key={r} className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              {r}
            </span>
          ))}
        </div>
      </Card>

      {!night && (
        <Card className="gap-2 px-5 py-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
            <MoonIcon className="size-3.5" /> Nachts wach im Bett
          </div>
          <ol className="flex flex-col gap-1.5">
            {AWAKE_IN_BED.map((t, i) => (
              <li key={t} className="flex gap-2 text-sm">
                <span className="num text-muted-foreground">{i + 1}.</span>
                {t}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <CheckIn today={today} log={log} defaultHours={config.sleepHours} recent={recent} advice={advice?.text} />

      <Card className="gap-1 px-4 py-2">
        <p className="px-1 pt-2 text-xs text-muted-foreground">
          Nach 4 Wochen nicht besser? Zum Hausarzt. Schlaftherapie gibt es als App auf Rezept (z. B. somnio).
        </p>
        <Accordion>
          <AccordionItem value="sources">
            <AccordionTrigger className="text-xs font-semibold">Quellen</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                {SLEEP_SOURCES.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                    {s.label}
                  </a>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <SettingsDrawer key={`${config.wakeTime}-${config.sleepHours}-${settingsOpen}`} open={settingsOpen} onOpenChange={setSettingsOpen} config={config} onSave={updateConfig} />
    </div>
  )
}

function StepRow({ step, done, isNext, onToggle }: { step: SleepStep; done: boolean; isNext: boolean; onToggle: () => void }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-3xl bg-background p-2.5 transition-opacity", done && "opacity-50", isNext && !done && "ring-2 ring-primary/50")}>
      <div className={cn("num flex h-10 w-14 shrink-0 items-center justify-center rounded-2xl text-sm font-bold", isNext && !done ? "bg-primary text-primary-foreground" : "bg-card")}>
        {step.time}
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("text-sm leading-tight font-semibold", done && "line-through")}>{step.title}</div>
        <div className="text-xs text-muted-foreground">{step.short}</div>
      </div>
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onToggle}
        aria-label={done ? `${step.title} nicht erledigt` : `${step.title} erledigt`}
        aria-pressed={done}
        className={cn("flex size-10 shrink-0 items-center justify-center rounded-full border-2", done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30")}
      >
        {done && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING}>
            <CheckIcon className="size-5" strokeWidth={3} />
          </motion.span>
        )}
      </motion.button>
    </div>
  )
}

function CheckIn({ today, log, defaultHours, recent, advice }: { today: string; log?: SleepLog; defaultHours: number; recent: SleepLog[]; advice?: string }) {
  const hours = log?.hours ?? defaultHours
  return (
    <Card className="gap-3 px-5 py-4">
      <div className="text-xs font-medium text-muted-foreground uppercase">Letzte Nacht</div>
      <div className="flex flex-col gap-1.5">
        <div className="text-xs font-semibold text-muted-foreground">Eingeschlafen nach (min)</div>
        <Pills
          className="bg-background"
          value={log?.onset === undefined ? "" : String(log.onset)}
          onChange={(v) => {
            tap()
            void patchSleepLog(today, { onset: Number(v) as SleepOnset })
          }}
          options={ONSET_LABEL.map((l, i) => ({ value: String(i), label: l }))}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="text-xs font-semibold text-muted-foreground">Erholt?</div>
        <Pills
          className="bg-background"
          value={log?.quality ? String(log.quality) : ""}
          onChange={(v) => {
            tap()
            void patchSleepLog(today, { quality: Number(v) as SleepQuality, hours })
          }}
          options={[
            { value: "1", label: "schlecht" },
            { value: "2", label: "mittel" },
            { value: "3", label: "gut" },
          ]}
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold text-muted-foreground">Geschlafen</div>
        <Stepper value={hours} onChange={(v) => void patchSleepLog(today, { hours: Math.min(12, Math.max(3, v)) })} step={0.5} min={3} unit="h" />
      </div>
      {advice && <p className="rounded-2xl bg-background px-4 py-2.5 text-sm font-medium">Training: {advice}</p>}
      <Trend date={today} logs={recent} />
    </Card>
  )
}

/** 14 Tage: Farbe = Erholung, roter Ring = über 30 min wach gelegen */
function Trend({ date, logs }: { date: string; logs: SleepLog[] }) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(date, i - 13))
  const byDate = new Map(logs.map((l) => [l.date, l]))
  const color = (q?: SleepQuality) => (q === 3 ? "bg-primary" : q === 2 ? "bg-primary-mid" : q === 1 ? "bg-primary-soft" : "bg-background")
  return (
    <div className="flex flex-col gap-1.5 pt-1">
      <div className="flex justify-between">
        {days.map((d) => {
          const l = byDate.get(d)
          return <span key={d} title={d} className={cn("size-3.5 rounded-full", color(l?.quality), (l?.onset ?? 0) >= 2 && "ring-2 ring-destructive/70")} />
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>vor 2 Wochen</span>
        <span>Ring = lange wach</span>
        <span>heute</span>
      </div>
    </div>
  )
}

function SettingsDrawer({
  open,
  onOpenChange,
  config,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  config: SleepConfig
  onSave: (patch: Partial<SleepConfig>) => Promise<void>
}) {
  const [wakeTime, setWakeTime] = useState(config.wakeTime)
  const [sleepHours, setSleepHours] = useState(config.sleepHours)
  const [notifications, setNotifications] = useState(config.notifications)
  const bed = bedtimeFrom(wakeTime, sleepHours)

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Schlafzeiten</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-5 px-6 py-2">
          <div className="flex flex-col gap-2">
            <div className="text-center text-xs font-medium text-muted-foreground uppercase">Aufstehen, jeden Tag</div>
            <div className="flex items-center justify-between gap-3">
              <Button variant="secondary" size="icon-lg" className="size-14 rounded-full bg-muted" onClick={() => setWakeTime(shiftTime(wakeTime, -15))} aria-label="15 Minuten früher">
                <MinusIcon className="size-6" />
              </Button>
              <div className="num text-5xl font-bold">{wakeTime}</div>
              <Button variant="secondary" size="icon-lg" className="size-14 rounded-full bg-muted" onClick={() => setWakeTime(shiftTime(wakeTime, 15))} aria-label="15 Minuten später">
                <PlusIcon className="size-6" />
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-center text-xs font-medium text-muted-foreground uppercase">Zeit im Bett</div>
            <Stepper value={sleepHours} onChange={(v) => setSleepHours(Math.min(9.5, Math.max(MIN_SLEEP_HOURS, v)))} step={0.5} min={MIN_SLEEP_HOURS} unit="h" format={fmtH} />
          </div>
          <div className="flex items-center justify-between rounded-3xl bg-primary-soft px-5 py-4">
            <span className="text-sm font-semibold">Ins Bett</span>
            <span className="num text-2xl font-bold text-primary">{bed}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold">Erinnerungen</div>
              <div className="text-xs text-muted-foreground">Benachrichtigung zu jedem Schritt</div>
            </div>
            <Toggle
              pressed={notifications}
              onPressedChange={async (v) => {
                if (v && !(await requestNotificationPermission())) {
                  toast.error("Benachrichtigungen sind in Android nicht erlaubt")
                  return
                }
                setNotifications(v)
              }}
              aria-label="Erinnerungen"
              className="size-12 shrink-0 rounded-full bg-muted text-muted-foreground hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              <BellIcon className="size-5" />
            </Toggle>
          </div>
        </div>
        <DrawerFooter className="pb-safe">
          <Button
            size="lg"
            className="h-14 rounded-full text-base font-semibold"
            onClick={async () => {
              await onSave({ wakeTime, sleepHours, notifications })
              onOpenChange(false)
            }}
          >
            Übernehmen
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
