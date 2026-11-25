import { useMemo, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts"
import { motion } from "motion/react"
import { Card } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Pills, SPRING, fmtKg } from "@/components/bits"
import { MUSCLE_LABEL, UNITS, type MuscleGroup } from "@/data/plan"
import { addDays, fromISO, todayISO, weekStart, WEEKDAY_SHORT, daysBetween } from "@/lib/dates"
import { db, getSettings } from "@/lib/db"
import { Comparison } from "@/components/Comparison"
import { e1rm, e1rmBodyweight } from "@/lib/progression"
import { CORRIDOR } from "@/lib/volume"
import { primaryByKey, variantByKey, variantName } from "@/lib/workout"
import { cn } from "@/lib/utils"

type Period = "week" | "month" | "year"
const DAYS: Record<Period, number> = { week: 7, month: 30, year: 365 }
const STREAK_MIN = 4

const shortDate = (s: string) => fromISO(s).toLocaleDateString("de-DE", { day: "numeric", month: "numeric" })

export function Progress() {
  const [period, setPeriod] = useState<Period>("month")
  const today = todayISO()
  const from = addDays(today, -(DAYS[period] - 1))
  const data = useLiveQuery(async () => {
    const [sessions, sets, bodyweight, cardio] = await Promise.all([
      db.sessions.where("status").equals("done").toArray(),
      db.sets.toArray(),
      db.bodyweight.orderBy("date").toArray(),
      db.cardio.toArray(),
    ])
    return { sessions, sets, bodyweight, cardio }
  }, [])

  const settings = useLiveQuery(() => getSettings(), [])
  // Der Ausklang nach dem Krafttraining zählt nicht als eigene Einheit.
  const sessions = useMemo(() => (data?.sessions ?? []).filter((s) => s.unit !== "cooldown"), [data])
  const streak = useMemo(() => {
    const perWeek = new Map<string, number>()
    for (const s of sessions) perWeek.set(weekStart(s.date), (perWeek.get(weekStart(s.date)) ?? 0) + 1)
    let wk = weekStart(today)
    if ((perWeek.get(wk) ?? 0) < STREAK_MIN) wk = addDays(wk, -7)
    let n = 0
    while ((perWeek.get(wk) ?? 0) >= STREAK_MIN) {
      n++
      wk = addDays(wk, -7)
    }
    return n
  }, [sessions, today])

  return (
    <div className="flex flex-col gap-4 px-4 pt-safe pb-32">
      <header className="flex items-end justify-between">
        <h1 className="text-[2.5rem] leading-none font-bold tracking-tight">Fortschritt</h1>
      </header>

      <Card className="flex-row items-end justify-between bg-primary px-6 py-6 text-primary-foreground">
        <div>
          <div className="num text-7xl leading-none font-bold">{streak}</div>
          <div className="mt-2 text-sm opacity-90">Wochen in Folge mit {STREAK_MIN}+ Einheiten</div>
        </div>
        <div className="text-right text-sm opacity-90">
          <div className="num text-2xl font-bold">{sessions.length}</div>
          Einheiten gesamt
        </div>
      </Card>

      <ActivityGrid sessions={sessions} today={today} />

      <Pills
        value={period}
        onChange={setPeriod}
        className="w-full"
        options={[
          { value: "week", label: "Woche" },
          { value: "month", label: "Monat" },
          { value: "year", label: "Jahr" },
        ]}
      />

      {data && (
        <>
          <StrengthCurves data={data} from={from} />
          {settings && <Comparison birthYear={settings.birthYear} sessions={sessions} sets={data.sets} bodyweight={data.bodyweight} />}
          <BodyWeight weights={data.bodyweight} from={from} />
          <MuscleVolume data={data} from={from} today={today} />
          <CardioMinutes cardio={data.cardio} from={from} today={today} period={period} />
        </>
      )}
    </div>
  )
}

type Data = {
  sessions: import("@/lib/db").Session[]
  sets: import("@/lib/db").SetRow[]
  bodyweight: import("@/lib/db").BodyWeight[]
  cardio: import("@/lib/db").Cardio[]
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="gap-3 px-5 py-5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-xs font-medium text-muted-foreground uppercase">{title}</div>
        {right}
      </div>
      {children}
    </Card>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="py-6 text-center text-sm text-muted-foreground">{text}</div>
}

function ActivityGrid({ sessions, today }: { sessions: Data["sessions"]; today: string }) {
  const start = addDays(weekStart(today), -77)
  const byDate = new Map<string, string>()
  for (const s of sessions) {
    const kind = UNITS[s.unit].type === "cardio" ? "cardio" : s.mode
    if (kind !== "cardio" || !byDate.has(s.date)) byDate.set(s.date, kind)
  }
  const color: Record<string, string> = { gym: "bg-primary", home: "bg-primary-mid", cardio: "bg-primary-soft" }
  return (
    <Section
      title="Letzte 12 Wochen"
      right={
        <div className="flex gap-3 text-[11px] text-muted-foreground">
          {[
            ["gym", "Gym"],
            ["home", "Home"],
            ["cardio", "Cardio"],
          ].map(([k, l]) => (
            <span key={k} className="flex items-center gap-1">
              <span className={cn("size-2.5 rounded-full", color[k])} />
              {l}
            </span>
          ))}
        </div>
      }
    >
      <div className="flex gap-1.5">
        <div className="flex flex-col gap-1 pr-0.5">
          {WEEKDAY_SHORT.map((d, i) => (
            <div key={d} className="flex h-[min(5vw,22px)] items-center text-[9px] text-muted-foreground">
              {i % 2 === 0 ? d : ""}
            </div>
          ))}
        </div>
        {Array.from({ length: 12 }, (_, w) => (
          <div key={w} className="flex flex-1 flex-col gap-1">
            {Array.from({ length: 7 }, (_, d) => {
              const date = addDays(start, w * 7 + d)
              const kind = byDate.get(date)
              return (
                <div
                  key={d}
                  className={cn(
                    "h-[min(5vw,22px)] rounded-[35%]",
                    kind ? color[kind] : date > today ? "bg-transparent" : "bg-background",
                    date === today && "ring-2 ring-foreground/40",
                  )}
                />
              )
            })}
          </div>
        ))}
      </div>
    </Section>
  )
}

const strengthConfig = { e1rm: { label: "Geschätztes 1RM", color: "var(--primary)" } } satisfies ChartConfig

function StrengthCurves({ data, from }: { data: Data; from: string }) {
  const byKey = useMemo(() => primaryByKey(), [])
  // Mehrgelenksübungen aller Tage (A und B): Pause ≥ 2 min im Plan
  const keys = [...new Set(data.sets.map((s) => s.key))].filter((k) => (byKey.get(k)?.rest ?? 0) >= 120)
  const [sel, setSel] = useState<string | null>(null)
  const key = sel && keys.includes(sel) ? sel : keys[0]
  const nameOf = variantName
  // Klimmzüge, Dips: Körpergewicht zählt mit, sonst bricht die Kurve beim ersten Zusatzgewicht ein.
  const v = key ? variantByKey(key) : undefined
  const withBody = v?.load === "bodyweight" && !v.noLoad && data.bodyweight.length > 0
  const bodyAt = (date: string) => {
    let kg = data.bodyweight[0]?.kg ?? 0
    for (const b of data.bodyweight) if (b.date <= date) kg = b.kg
    return kg
  }

  const points = (() => {
    if (!key) return []
    const sessionDate = new Map(data.sessions.map((s) => [s.id!, s.date]))
    const best = new Map<string, number>()
    for (const s of data.sets) {
      const date = sessionDate.get(s.sessionId)
      if (s.key !== key || !date || date < from) continue
      best.set(date, Math.max(best.get(date) ?? 0, withBody ? e1rmBodyweight(s, bodyAt(date)) : e1rm(s)))
    }
    return [...best.entries()].sort().map(([date, v]) => ({ date: shortDate(date), e1rm: Math.round(v * 10) / 10 }))
  })()

  const last = points[points.length - 1]
  return (
    <Section title="Kraftkurven" right={last && <span className="num text-sm font-semibold">{fmtKg(last.e1rm)} kg</span>}>
      {keys.length === 0 ? (
        <Empty text="Noch keine Grundübungen trainiert" />
      ) : (
        <>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            {keys.map((k) => (
              <button
                key={k}
                onClick={() => setSel(k)}
                className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold", k === key ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground")}
              >
                {nameOf(k)}
              </button>
            ))}
          </div>
          {points.length === 0 ? (
            <Empty text="Keine Daten im Zeitraum" />
          ) : (
            <SoftArea config={strengthConfig} dataKey="e1rm" points={points} pad={5} className="h-44" dots />
          )}
          <div className="text-[11px] text-muted-foreground">
            {v?.load === "bodyweight" && !withBody
              ? "Trag dein Körpergewicht ein, dann zählt es hier mit"
              : `Geschätztes Maximalgewicht (1RM) je Einheit${withBody ? ", inkl. Körpergewicht" : ""}`}
          </div>
        </>
      )}
    </Section>
  )
}

const weightConfig = { avg: { label: "7-Tage-Mittel", color: "var(--primary)" } } satisfies ChartConfig

function BodyWeight({ weights, from }: { weights: Data["bodyweight"]; from: string }) {
  const points = useMemo(() => {
    return weights
      .filter((w) => w.date >= from)
      .map((w) => {
        const win = weights.filter((x) => x.date <= w.date && daysBetween(x.date, w.date) < 7)
        const avg = win.reduce((a, x) => a + x.kg, 0) / win.length
        return { date: shortDate(w.date), avg: Math.round(avg * 10) / 10 }
      })
  }, [weights, from])
  const last = points[points.length - 1]
  return (
    <Section
      title="Körpergewicht · 7-Tage-Mittel"
      right={
        last && (
          <span>
            <span className="num text-2xl font-bold">{fmtKg(last.avg)}</span>
            <span className="ml-0.5 text-xs text-muted-foreground">kg</span>
          </span>
        )
      }
    >
      {points.length < 2 ? (
        <Empty text="Trage dein Gewicht auf „Heute“ oben rechts ein" />
      ) : (
        <SoftArea config={weightConfig} dataKey="avg" points={points} pad={1} className="h-36" />
      )}
    </Section>
  )
}

const MAX_SETS = 22

function MuscleVolume({ data, from, today }: { data: Data; from: string; today: string }) {
  const byKey = useMemo(() => primaryByKey(), [])
  const rows = useMemo(() => {
    const inRange = data.sessions.filter((s) => s.date >= from)
    const ids = new Set(inRange.map((s) => s.id))
    // Durch die tatsächlich trainierten Wochen teilen, nicht durch den ganzen Zeitraum.
    const first = inRange.reduce((m, s) => (s.date < m ? s.date : m), today)
    const weeks = Math.max(1, (daysBetween(first, today) + 1) / 7)
    const count: Partial<Record<MuscleGroup, number>> = {}
    for (const s of data.sets) {
      if (!ids.has(s.sessionId)) continue
      const ex = byKey.get(s.key)
      if (!ex) continue
      count[ex.primary] = (count[ex.primary] ?? 0) + 1
      for (const m of ex.secondary) count[m] = (count[m] ?? 0) + 0.5
    }
    return (Object.keys(MUSCLE_LABEL) as MuscleGroup[]).map((m) => ({
      muscle: m,
      sets: Math.round(((count[m] ?? 0) / weeks) * 10) / 10,
    }))
  }, [data, from, today, byKey])
  const pct = (v: number) => `${(Math.min(v, MAX_SETS) / MAX_SETS) * 100}%`

  return (
    <Section title="Sätze pro Muskel und Woche">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="h-2.5 w-5 rounded-full bg-primary-soft" />
        Zielbereich {CORRIDOR[0]}–{CORRIDOR[1]} für große Muskeln
      </div>
      <div className="flex flex-col gap-2.5">
        {rows.map((r, i) => (
          <div key={r.muscle} className="grid grid-cols-[6.5rem_1fr_2.25rem] items-center gap-3">
            <span className="truncate text-xs text-muted-foreground">{MUSCLE_LABEL[r.muscle]}</span>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-background">
              <div
                className="absolute inset-y-0 rounded-full bg-primary-soft"
                style={{ left: pct(CORRIDOR[0]), width: `calc(${pct(CORRIDOR[1])} - ${pct(CORRIDOR[0])})` }}
              />
              <motion.div
                className={cn("absolute inset-y-0 left-0 rounded-full", r.sets >= CORRIDOR[0] ? "bg-primary" : "bg-primary-mid")}
                initial={{ width: 0 }}
                animate={{ width: pct(r.sets) }}
                transition={{ ...SPRING, delay: i * 0.02 }}
              />
            </div>
            <span className="num text-right text-xs font-semibold">{fmtKg(r.sets)}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

const cardioConfig = { minutes: { label: "Minuten", color: "var(--primary)" } } satisfies ChartConfig

/** WHO: 1 min intensiv zählt wie 2 min moderat. Die harten Intervall-Minuten zählen darum doppelt. */
const HARD_MIN = Object.fromEntries(
  Object.values(UNITS).map((u) => [u.id, u.type === "cardio" ? u.phases.filter((p) => p.hard).reduce((a, p) => a + p.minutes, 0) : 0]),
)
const credit = (c: Data["cardio"][number]) => c.minutes + Math.min(HARD_MIN[c.kind] ?? 0, c.minutes)

function CardioMinutes({ cardio, from, today, period }: { cardio: Data["cardio"]; from: string; today: string; period: Period }) {
  const thisWeek = weekStart(today)
  const weekMin = cardio.filter((c) => c.date >= thisWeek).reduce((a, c) => a + credit(c), 0)
  const bars = useMemo(() => {
    const out: { week: string; minutes: number; current: boolean }[] = []
    for (let wk = weekStart(from); wk <= thisWeek; wk = addDays(wk, 7)) {
      const minutes = cardio.filter((c) => c.date >= wk && c.date < addDays(wk, 7)).reduce((a, c) => a + credit(c), 0)
      out.push({ week: shortDate(wk), minutes, current: wk === thisWeek })
    }
    return out
  }, [cardio, from, thisWeek])
  const pct = Math.min(100, (weekMin / 150) * 100)
  return (
    <Section
      title="Cardio diese Woche"
      right={
        <span>
          <span className="num text-2xl font-bold">{weekMin}</span>
          <span className="ml-0.5 text-xs text-muted-foreground">/ 150 min</span>
        </span>
      }
    >
      <div className="h-3 overflow-hidden rounded-full bg-background">
        <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={SPRING} />
      </div>
      {period !== "week" && bars.length > 1 && (
        <ChartContainer config={cardioConfig} className="aspect-auto h-32 w-full">
          <BarChart data={bars} margin={{ left: 0, right: 8, top: 8 }}>
            <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={10} interval="preserveStartEnd" />
            <YAxis width={28} tickLine={false} axisLine={false} fontSize={11} domain={[0, (max: number) => Math.max(160, max)]} />
            <ReferenceLine y={150} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="minutes" radius={999} barSize={14} animationDuration={600} background={{ fill: "var(--background)", radius: 999 }}>
              {bars.map((b) => (
                <Cell key={b.week} fill={b.current ? "var(--primary)" : "var(--primary-mid)"} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
      <p className="text-[11px] text-muted-foreground">Harte Intervall-Minuten zählen doppelt (WHO: 1 min intensiv = 2 min moderat).</p>
    </Section>
  )
}

/** Weiche Kurve mit Verlaufsfläche, für Kraft und Körpergewicht */
function SoftArea({
  config,
  dataKey,
  points,
  pad,
  className,
  dots = false,
}: {
  config: ChartConfig
  dataKey: string
  points: Record<string, string | number>[]
  pad: number
  className?: string
  dots?: boolean
}) {
  const gid = `fill-${dataKey}`
  const color = `var(--color-${dataKey})`
  return (
    <ChartContainer config={config} className={cn("aspect-auto w-full", className)}>
      <AreaChart data={points} margin={{ left: 0, right: 8, top: 10 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 6" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} tickMargin={6} minTickGap={16} />
        <YAxis
          width={40}
          tickLine={false}
          axisLine={false}
          fontSize={11}
          domain={[`dataMin - ${pad}`, `dataMax + ${pad}`]}
          tickFormatter={(v: number) => v.toLocaleString("de-DE", { maximumFractionDigits: pad < 5 ? 1 : 0 })}
        />
        <ChartTooltip cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          fill={`url(#${gid})`}
          animationDuration={700}
          dot={dots ? { r: 3.5, fill: "var(--card)", stroke: color, strokeWidth: 2 } : false}
          activeDot={{ r: 6, fill: color, stroke: "var(--card)", strokeWidth: 3 }}
        />
      </AreaChart>
    </ChartContainer>
  )
}
