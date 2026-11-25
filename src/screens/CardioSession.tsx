import { useEffect, useMemo, useRef, useState } from "react"
import { XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { PoseLoop } from "@/components/bits"
import { UNITS, type CardioUnit } from "@/data/plan"
import { getSettings, type Session } from "@/lib/db"
import { formatClock, phaseIndex, remainingMs, timeline } from "@/lib/timer"
import { alarm, cancelCardio, isNative, scheduleCardio } from "@/lib/native"
import { EXERCISES, discardSession, finishSession, type Summary } from "@/lib/workout"
import { useNow } from "@/hooks/useNow"
import { cn } from "@/lib/utils"
import { SummaryView } from "./Session"

export function CardioSession({ session, onClose }: { session: Session; onClose: () => void }) {
  const unit = UNITS[session.unit] as CardioUnit
  const tl = useMemo(() => timeline(unit.phases, session.startedAt), [unit, session.startedAt])
  const now = useNow(250)
  const idx = phaseIndex(tl, now)
  const finished = idx >= tl.length
  const phase = tl[Math.min(idx, tl.length - 1)]
  const [summary, setSummary] = useState<Summary | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notify, setNotify] = useState(true)
  const lastIdx = useRef(idx)

  useEffect(() => {
    void getSettings().then((s) => {
      setNotify(s.notifications)
      if (s.notifications)
        void scheduleCardio(tl.map((p, i) => ({ endAt: p.endAt, next: tl[i + 1] ? `Jetzt: ${tl[i + 1].label} (${tl[i + 1].minutes} min)` : "Einheit geschafft" })))
    })
  }, [tl])

  // Phasenwechsel im Vordergrund signalisieren.
  useEffect(() => {
    if (idx !== lastIdx.current) {
      lastIdx.current = idx
      if (!isNative || !notify) alarm()
    }
  }, [idx, notify])

  const totalMs = tl[tl.length - 1].endAt - session.startedAt
  const elapsedMin = Math.round(Math.min(now - session.startedAt, totalMs) / 60_000)

  const finish = async () => {
    setMenuOpen(false)
    void cancelCardio(tl.length)
    if (elapsedMin < 1) {
      await discardSession(session.id!)
      return onClose()
    }
    setSummary(await finishSession(session.id!, elapsedMin))
  }

  if (summary) return <SummaryView summary={summary} unitName={unit.name} onClose={onClose} />

  const left = finished ? 0 : remainingMs(phase.endAt, now)
  const progress = finished ? 1 : 1 - left / (phase.endAt - phase.startAt)
  const R = 120
  const C = 2 * Math.PI * R
  const info = EXERCISES[unit[session.mode].exId]

  return (
    <div className="fixed inset-0 z-50 flex flex-col gap-4 overflow-y-auto bg-background px-4 pt-safe pb-safe">
      <header className="flex items-center justify-between">
        <Button variant="secondary" size="icon-lg" className="rounded-full bg-card" onClick={() => setMenuOpen(true)} aria-label="Menü">
          <XIcon />
        </Button>
        <div className="text-sm font-semibold">{unit.name}</div>
        <div className="num w-12 text-right text-sm text-muted-foreground">{formatClock(Math.max(0, totalMs - (now - session.startedAt)))}</div>
      </header>

      <div className="flex flex-col items-center gap-2">
        <div className={cn("rounded-full px-4 py-1 text-sm font-semibold", phase.hard ? "bg-primary text-primary-foreground" : "bg-card")}>
          {finished ? "Geschafft" : phase.label}
        </div>
        <div className="relative flex items-center justify-center">
          <svg width="260" height="260" viewBox="0 0 280 280" className="-rotate-90">
            <circle cx="140" cy="140" r={R} fill="none" stroke="var(--card)" strokeWidth="18" />
            <circle cx="140" cy="140" r={R} fill="none" stroke="var(--primary)" strokeWidth="18" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
          </svg>
          <div className="num absolute text-7xl font-bold">{formatClock(left)}</div>
        </div>
      </div>

      {tl.length > 1 && (
        <div className="flex gap-1">
          {tl.map((p, i) => (
            <div key={i} style={{ flex: p.minutes }} className={cn("h-2 rounded-full", i < idx ? "bg-primary" : i === idx ? "bg-primary-mid" : p.hard ? "bg-primary-soft" : "bg-card")} />
          ))}
        </div>
      )}

      <Card className="flex-row items-center gap-3 p-3">
        <PoseLoop info={info} className="size-20 shrink-0 rounded-2xl" />
        <div className="text-sm text-muted-foreground">
          <div className="font-semibold text-foreground">{unit[session.mode].text}</div>
          {unit.description}
        </div>
      </Card>

      <div className="flex-1" />
      <Button size="lg" variant={finished ? "default" : "secondary"} className={cn("h-16 rounded-full text-lg font-semibold", !finished && "bg-card")} onClick={finished ? finish : () => setMenuOpen(true)}>
        {finished ? "Abschließen" : "Beenden"}
      </Button>

      <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Cardio beenden?</DrawerTitle>
          </DrawerHeader>
          <DrawerFooter className="pt-4 pb-safe">
            <Button size="lg" className="h-14 text-base" onClick={() => setMenuOpen(false)}>
              Weitermachen
            </Button>
            <Button size="lg" variant="secondary" className="h-14 text-base" onClick={finish}>
              Abschließen ({elapsedMin} min speichern)
            </Button>
            <Button
              size="lg"
              variant="destructive"
              className="h-14 text-base"
              onClick={async () => {
                void cancelCardio(tl.length)
                await discardSession(session.id!)
                onClose()
              }}
            >
              Verwerfen
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
