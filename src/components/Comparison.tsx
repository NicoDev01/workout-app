// Vergleich mit Männern im gleichen Alter: Bankdrücken relativ zum Körpergewicht, Körpergewicht, Trainingshäufigkeit.
import { useState } from "react"
import { motion } from "motion/react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SPRING, fmtKg } from "@/components/bits"
import { UNITS } from "@/data/plan"
import { NORM_SOURCES, STRENGTH_2X_SHARE, avgWeight, benchNorms, benchPercentile } from "@/data/norms"
import { addDays, todayISO } from "@/lib/dates"
import { updateSettings, type BodyWeight, type Session, type SetRow } from "@/lib/db"
import { e1rm } from "@/lib/progression"

const BENCH_KEYS = ["gym:bench-press"]

export function Comparison({
  birthYear,
  sessions,
  sets,
  bodyweight,
}: {
  birthYear?: number
  sessions: Session[]
  sets: SetRow[]
  bodyweight: BodyWeight[]
}) {
  const today = todayISO()
  if (!birthYear) return <AskBirthYear />
  const age = Number(today.slice(0, 4)) - birthYear
  const body = bodyweight.at(-1)?.kg

  // Bestes geschätztes 1RM im Bankdrücken der letzten 8 Wochen
  const recent = new Set(sessions.filter((s) => s.date >= addDays(today, -56)).map((s) => s.id))
  const benchSets = sets.filter((s) => recent.has(s.sessionId) && BENCH_KEYS.includes(s.key))
  const bench = benchSets.length ? Math.max(...benchSets.map(e1rm)) : null
  const ratio = bench && body ? bench / body : null
  const pct = ratio ? benchPercentile(ratio, age) : null
  const norms = benchNorms(age)

  const fourWeeks = sessions.filter((s) => s.date > addDays(today, -28) && UNITS[s.unit]?.type === "strength").length / 4

  return (
    <Card className="gap-4 px-5 py-5">
      <div className="flex items-baseline justify-between">
        <div className="text-xs font-medium text-muted-foreground uppercase">Im Vergleich</div>
        <span className="text-[11px] text-muted-foreground">Männer, {age} Jahre</span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">Bankdrücken ÷ Körpergewicht</span>
          {ratio && <span className="num text-sm font-bold">{ratio.toFixed(2).replace(".", ",")} ×</span>}
        </div>
        {pct !== null ? (
          <>
            <PercentileBar pct={pct} />
            <div className="text-xs text-muted-foreground">
              Stärker als etwa <span className="font-semibold text-foreground">{pct} %</span> der Männer deines Alters. Durchschnitt: {String(norms[2]).replace(".", ",")} ×.
            </div>
          </>
        ) : (
          <div className="text-xs text-muted-foreground">
            {body ? "Erscheint nach deinem ersten Bankdrücken." : "Trag dein Körpergewicht auf „Heute“ ein, dann erscheint der Vergleich."}
          </div>
        )}
      </div>

      <Row label="Körpergewicht" you={body ? `${fmtKg(body)} kg` : "–"} avg={`${fmtKg(avgWeight(age))} kg`} />
      <Row label="Krafteinheiten pro Woche" you={fmtKg(Math.round(fourWeeks * 10) / 10)} avgLabel="Männer in Deutschland" avg={`nur ${STRENGTH_2X_SHARE} % schaffen 2+`} />

      <div className="flex flex-col gap-0.5 text-[10px] leading-snug text-muted-foreground">
        {NORM_SOURCES.map((s) => (
          <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
            {s.label}
          </a>
        ))}
        <span>Bankdrück-Normen stammen von einer Maschine, daher nur grobe Orientierung.</span>
      </div>
    </Card>
  )
}

function PercentileBar({ pct }: { pct: number }) {
  return (
    <div className="relative pt-5">
      <div className="h-2.5 rounded-full bg-gradient-to-r from-primary-soft via-primary-mid to-primary" />
      <div className="absolute top-5 left-1/2 h-2.5 w-0.5 -translate-x-1/2 bg-background/90" />
      <motion.div
        className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
        initial={{ left: "0%" }}
        animate={{ left: `${pct}%` }}
        transition={SPRING}
      >
        <span className="rounded-full bg-foreground px-1.5 text-[10px] leading-4 font-bold text-background">Du</span>
        <span className="mt-0.5 size-3.5 rounded-full border-[3px] border-background bg-foreground" />
      </motion.div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        <span>schwächer</span>
        <span>Durchschnitt</span>
        <span>stärker</span>
      </div>
    </div>
  )
}

function Row({ label, you, avg, avgLabel = "Durchschnitt" }: { label: string; you: string; avg: string; avgLabel?: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-0.5">
      <span className="text-sm font-semibold">{label}</span>
      <span className="num text-sm font-bold">{you}</span>
      <span className="text-xs text-muted-foreground">{avgLabel}</span>
      <span className="num text-right text-xs text-muted-foreground">{avg}</span>
    </div>
  )
}

function AskBirthYear() {
  const [value, setValue] = useState("")
  const year = Number(value)
  const valid = year > 1920 && year < Number(todayISO().slice(0, 4)) - 14
  return (
    <Card className="gap-3 px-5 py-5">
      <div className="text-xs font-medium text-muted-foreground uppercase">Im Vergleich</div>
      <p className="text-sm text-muted-foreground">Mit deinem Geburtsjahr vergleicht die App dich mit Männern in deinem Alter.</p>
      <div className="flex gap-2">
        <input
          inputMode="numeric"
          placeholder="Geburtsjahr"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className="h-12 min-w-0 flex-1 rounded-full bg-background px-5 text-base outline-none focus:ring-2 focus:ring-primary"
        />
        <Button size="lg" className="h-12 rounded-full px-5" disabled={!valid} onClick={() => void updateSettings({ birthYear: year })}>
          Speichern
        </Button>
      </div>
    </Card>
  )
}
