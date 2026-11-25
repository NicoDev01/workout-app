// Tages-Checkliste für das Hüftprogramm: welche Übungen heute dran sind, abhaken, Schnappen bewerten.
import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { motion } from "motion/react"
import { CheckIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Pills, PoseLoop, SPRING } from "@/components/bits"
import { HIP_BLOCK_LABEL, hipItemsFor, type HipItem, type HipType } from "@/data/hip"
import { addDays } from "@/lib/dates"
import { db, type HipLog } from "@/lib/db"
import { tap } from "@/lib/native"
import { cn } from "@/lib/utils"
import { EXERCISES } from "@/lib/workout"

async function patchLog(date: string, patch: Partial<HipLog>) {
  const cur = (await db.hip.get(date)) ?? { date, done: [] }
  await db.hip.put({ ...cur, ...patch, date })
}

export async function toggleHipItem(date: string, id: string) {
  const cur = (await db.hip.get(date)) ?? { date, done: [] }
  const done = cur.done.includes(id) ? cur.done.filter((x) => x !== id) : [...cur.done, id]
  await db.hip.put({ ...cur, done })
}

export function HipCard({ date, unit, type }: { date: string; unit: string | null; type: HipType }) {
  const log = useLiveQuery(() => db.hip.get(date), [date])
  const recent = useLiveQuery(() => db.hip.where("date").between(addDays(date, -13), date, true, true).toArray(), [date]) ?? []
  const [detail, setDetail] = useState<HipItem | null>(null)
  const items = hipItemsFor(unit, type)
  const done = log?.done ?? []
  const count = items.filter((i) => done.includes(i.id)).length
  const blocks = [...new Set(items.map((i) => i.block))]

  const toggle = (id: string) => {
    tap(!done.includes(id))
    void toggleHipItem(date, id)
  }

  return (
    <Card className="gap-4 px-4 py-4">
      <div className="flex items-baseline justify-between px-1">
        <div className="text-xs font-medium text-muted-foreground uppercase">Hüfte heute</div>
        <span className={cn("num text-sm font-bold", count === items.length && "text-primary")}>
          {count}/{items.length}
        </span>
      </div>

      {blocks.map((b) => (
        <div key={b} className="flex flex-col gap-2">
          <div className="px-1 text-sm font-semibold">{HIP_BLOCK_LABEL[b]}</div>
          {items
            .filter((i) => i.block === b)
            .map((i) => (
              <HipRow key={i.id} item={i} on={done.includes(i.id)} onOpen={() => setDetail(i)} onToggle={() => toggle(i.id)} />
            ))}
        </div>
      ))}

      <div className="flex flex-col gap-2 border-t border-background pt-4">
        <div className="px-1 text-sm font-semibold">Schnappen heute</div>
        <Pills
          className="bg-background"
          value={log?.snap === undefined ? "" : String(log.snap)}
          onChange={(v) => void patchLog(date, { snap: Number(v) as 0 | 1 | 2 })}
          options={[
            { value: "0", label: "keins" },
            { value: "1", label: "selten" },
            { value: "2", label: "oft" },
          ]}
        />
        <button
          onClick={() => void patchLog(date, { pain: !log?.pain })}
          className={cn("flex h-10 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-colors", log?.pain ? "bg-destructive/15 text-destructive" : "bg-background text-muted-foreground")}
        >
          {log?.pain ? "Mit Schmerzen" : "Ohne Schmerzen"}
        </button>
        {log?.pain && (
          <p className="px-1 text-xs text-muted-foreground">
            Schmerzhafte Übungen weglassen oder kleiner machen. Bleibt Schmerz, die Hüfte blockiert oder knickt weg: Physio oder Arzt.
          </p>
        )}
        <Trend date={date} logs={recent} />
      </div>

      <Drawer open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DrawerContent>
          {detail && (
            <>
              <DrawerHeader>
                <DrawerTitle>{detail.name}</DrawerTitle>
                <p className="num text-sm text-muted-foreground">{detail.dose}</p>
              </DrawerHeader>
              <div className="flex flex-col gap-3 overflow-y-auto px-4">
                <PoseLoop info={EXERCISES[detail.exId]} className="mx-auto w-full max-w-72 rounded-3xl" />
                <p className="text-sm">{detail.cue}</p>
                <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                  {EXERCISES[detail.exId].tips.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
              <DrawerFooter className="pt-4 pb-safe">
                <Button
                  size="lg"
                  className="h-14 text-base"
                  onClick={() => {
                    if (!done.includes(detail.id)) toggle(detail.id)
                    setDetail(null)
                  }}
                >
                  <CheckIcon /> Erledigt
                </Button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </Card>
  )
}

function HipRow({ item, on, onOpen, onToggle }: { item: HipItem; on: boolean; onOpen: () => void; onToggle: () => void }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-3xl bg-background p-2 transition-opacity", on && "opacity-60")}>
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.98]">
        <PoseLoop info={EXERCISES[item.exId]} still className="size-12 shrink-0 rounded-2xl" />
        <div className="min-w-0">
          <div className={cn("line-clamp-2 text-sm leading-tight font-semibold", on && "line-through")}>{item.name}</div>
          <div className="num text-xs text-muted-foreground">{item.dose}</div>
        </div>
      </button>
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onToggle}
        aria-label={on ? `${item.name} nicht erledigt` : `${item.name} erledigt`}
        aria-pressed={on}
        className={cn("mr-1 flex size-10 shrink-0 items-center justify-center rounded-full border-2", on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30")}
      >
        {on && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING}>
            <CheckIcon className="size-5" strokeWidth={3} />
          </motion.span>
        )}
      </motion.button>
    </div>
  )
}

/** Letzte 14 Tage: Punktfarbe = Schnappen, Ring = Schmerz */
function Trend({ date, logs }: { date: string; logs: HipLog[] }) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(date, i - 13))
  const byDate = new Map(logs.map((l) => [l.date, l]))
  const color = (s?: number) => (s === 0 ? "bg-primary" : s === 1 ? "bg-primary-mid" : s === 2 ? "bg-primary-soft" : "bg-background")
  return (
    <div className="flex flex-col gap-1.5 px-1 pt-1">
      <div className="flex justify-between">
        {days.map((d) => {
          const l = byDate.get(d)
          return <span key={d} title={d} className={cn("size-3.5 rounded-full", color(l?.snap), l?.pain && "ring-2 ring-destructive/70")} />
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>vor 2 Wochen</span>
        <span>dunkel = kein Schnappen</span>
        <span>heute</span>
      </div>
    </div>
  )
}
