import { useRef, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import {
  BellIcon,
  CheckIcon,
  ChevronDownIcon,
  DownloadIcon,
  DumbbellIcon,
  SparklesIcon,
  UploadIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Toggle } from "@/components/ui/toggle"
import { HipSettings } from "@/components/HipSettings"
import {
  HIP_BLOCK_LABEL,
  hipBlocksFor,
  hipItemsFor,
  type HipItem,
} from "@/data/hip"
import { MUSCLE_LABEL, UNITS, type MuscleGroup } from "@/data/plan"
import {
  WEEKDAY_SHORT,
  todayISO,
  weekStart,
  formatDate,
  weekdayIndex,
  fromISO,
} from "@/lib/dates"
import { DEFAULT_SETTINGS, db, getSettings, updateSettings } from "@/lib/db"
import { preview } from "@/lib/schedule"
import { exportBackup, importBackup } from "@/lib/backup"
import { exportForAi } from "@/lib/aiExport"
import { requestNotificationPermission } from "@/lib/native"
import { cn } from "@/lib/utils"

export function Plan() {
  const today = todayISO()
  const sessions =
    useLiveQuery(
      () => db.sessions.where("status").equals("done").toArray(),
      []
    ) ?? []
  const settings = useLiveQuery(() => getSettings(), []) ?? DEFAULT_SETTINGS
  const lastWeight = useLiveQuery(() => db.bodyweight.orderBy("date").last())
  const done = sessions.map((s) => ({ date: s.date, unit: s.unit }))
  const past = [...done]
    .filter((d) => d.unit !== "cooldown")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-4)
  const next = preview(today, done, 8).filter(
    (d) =>
      !past.some((p) => p.date === d.date && UNITS[p.unit].type === "strength")
  )
  const fileRef = useRef<HTMLInputElement>(null)
  const monday = weekStart(today)
  const bonus = Object.entries(settings.volumeBonus).filter(
    ([, v]) => v && v > 0
  ) as [MuscleGroup, number][]

  const onImport = async (file?: File) => {
    if (!file) return
    if (
      !window.confirm(
        "Backup einspielen? Alle Daten auf diesem Gerät werden ersetzt."
      )
    )
      return
    try {
      await importBackup(file)
      toast.success("Backup eingespielt")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import fehlgeschlagen")
    }
  }

  return (
    <div className="pt-safe flex flex-col gap-5 px-4 pb-32">
      <header>
        <h1 className="text-[2.5rem] leading-none font-bold tracking-tight">
          Plan
        </h1>
        <div className="mt-1 text-sm text-muted-foreground">
          Push → Pull → Beine → Erholung, im Wechsel A und B
        </div>
      </header>

      {settings.deloadWeek && settings.deloadWeek >= monday && (
        <Card className="bg-primary-soft px-5 py-4 text-sm">
          {settings.deloadWeek === monday
            ? "Diese Woche"
            : `Ab ${formatDate(settings.deloadWeek)}`}
          : Entlastung mit halben Sätzen und RIR 3.
        </Card>
      )}

      <Card className="gap-0 px-2 py-2">
        {past.map((d, i) => (
          <DayRow key={`p${i}`} date={d.date} title={UNITS[d.unit].name} done />
        ))}
        {next.map((d) => (
          <DayRow
            key={d.date}
            date={d.date}
            title={d.unit ? UNITS[d.unit].name : "Erholungstag"}
            sub={
              d.unit
                ? UNITS[d.unit].focus
                : `${UNITS[d.cardio!].name} oder frei`
            }
            hip={
              settings.hip
                ? hipBlocksFor(d.unit)
                    .map((b) => HIP_BLOCK_LABEL[b].split(" ·")[0])
                    .join(" + ")
                : undefined
            }
            hipItems={
              settings.hip ? hipItemsFor(d.unit, settings.hip.type) : undefined
            }
          />
        ))}
      </Card>

      {bonus.length > 0 && (
        <Card className="gap-2 px-5 py-4">
          <div className="text-xs font-medium text-muted-foreground uppercase">
            Volumen gesteigert
          </div>
          {bonus.map(([m, v]) => (
            <div key={m} className="flex justify-between text-sm">
              <span>{MUSCLE_LABEL[m]}</span>
              <span className="num font-semibold">+{v} Sätze/Woche</span>
            </div>
          ))}
        </Card>
      )}

      {lastWeight && (
        <Card className="flex-row items-center justify-between px-5 py-4">
          <div className="text-sm text-muted-foreground">
            Protein pro Tag (1,6 g/kg)
          </div>
          <div>
            <span className="num text-2xl font-bold">
              {Math.round(lastWeight.kg * 1.6)}
            </span>
            <span className="ml-1 text-sm text-muted-foreground">g</span>
          </div>
        </Card>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-xs font-medium text-muted-foreground uppercase">
          Einstellungen
        </h2>
        <Card className="gap-0 px-2 py-1">
          <SettingRow
            icon={DumbbellIcon}
            title="Kurzhanteln zu Hause"
            hint="Home-Varianten nutzen verstellbare Kurzhanteln"
            on={settings.dumbbellsHome}
            onChange={(v) => updateSettings({ dumbbellsHome: v })}
          />
          <SettingRow
            icon={BellIcon}
            title="Timer-Benachrichtigung"
            hint="Ton und Vibration auch bei gesperrtem Display"
            on={settings.notifications}
            onChange={async (v) => {
              if (v && !(await requestNotificationPermission())) {
                toast.error("Benachrichtigungen sind in Android nicht erlaubt")
                return
              }
              await updateSettings({ notifications: v })
            }}
          />
        </Card>
        <HipSettings hip={settings.hip} />
        <Card className="flex-row gap-2 px-3 py-3">
          <Button
            variant="secondary"
            size="lg"
            className="h-12 flex-1 bg-background"
            onClick={() =>
              exportBackup().catch(() => toast.error("Export fehlgeschlagen"))
            }
          >
            <DownloadIcon /> Backup sichern
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="h-12 flex-1 bg-background"
            onClick={() => fileRef.current?.click()}
          >
            <UploadIcon /> Einspielen
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => onImport(e.target.files?.[0])}
          />
        </Card>
        <Card className="gap-2 px-3 py-3">
          <Button
            variant="secondary"
            size="lg"
            className="h-12 w-full bg-background"
            onClick={() =>
              exportForAi().catch(() => toast.error("Export fehlgeschlagen"))
            }
          >
            <SparklesIcon /> Für KI-Auswertung exportieren
          </Button>
          <p className="px-2 text-xs text-muted-foreground">
            Markdown-Datei mit Plan, allen Sätzen und Körpergewicht. Teilen und
            z. B. in Claude oder ChatGPT hochladen.
          </p>
        </Card>
      </section>

      <footer className="flex flex-col gap-1 px-1 text-xs text-muted-foreground">
        <span>
          Exercise data by{" "}
          <a
            href="https://repdb.co"
            target="_blank"
            rel="nofollow noreferrer"
            className="underline"
          >
            RepDB (repdb.co)
          </a>
        </span>
        <span>Sissy-Squat-Bilder: free-exercise-db (Public Domain)</span>
        <span>Kein medizinischer Rat. Training auf eigene Verantwortung.</span>
      </footer>
    </div>
  )
}

function DayRow({
  date,
  title,
  sub,
  hip,
  hipItems,
  done = false,
}: {
  date: string
  title: string
  sub?: string
  hip?: string
  hipItems?: HipItem[]
  done?: boolean
}) {
  const isToday = date === todayISO()
  const [open, setOpen] = useState(false)
  return (
    <div className={cn("rounded-3xl", isToday && "bg-background")}>
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2.5",
          hipItems && "cursor-pointer"
        )}
        onClick={() => hipItems && setOpen(!open)}
      >
        <div
          className={cn(
            "flex size-11 shrink-0 flex-col items-center justify-center rounded-full leading-none",
            isToday ? "bg-primary text-primary-foreground" : "bg-background"
          )}
        >
          <span className="text-[11px] font-semibold">
            {WEEKDAY_SHORT[weekdayIndex(date)]}
          </span>
          <span className="num text-[10px] opacity-70">
            {fromISO(date).getDate()}.
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn("font-semibold", done && "text-muted-foreground")}>
            {title}
          </div>
          {sub && (
            <div className="truncate text-xs text-muted-foreground">{sub}</div>
          )}
          {hip && (
            <div className="flex items-center gap-1 text-xs font-medium text-primary">
              Hüfte: {hip} · {hipItems?.length} Übungen
              <ChevronDownIcon
                className={cn(
                  "size-3.5 transition-transform",
                  open && "rotate-180"
                )}
              />
            </div>
          )}
        </div>
        {done && (
          <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <CheckIcon className="size-4" strokeWidth={3} />
          </div>
        )}
      </div>
      {open && hipItems && (
        <ul className="flex flex-col gap-1 px-4 pb-3 pl-[4.25rem]">
          {hipItems.map((i) => (
            <li key={i.id} className="flex justify-between gap-2 text-xs">
              <span className="font-medium">{i.name}</span>
              <span className="num shrink-0 text-muted-foreground">
                {i.dose}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SettingRow({
  icon: Icon,
  title,
  hint,
  on,
  onChange,
}: {
  icon: typeof BellIcon
  title: string
  hint: string
  on: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <Toggle
        pressed={on}
        onPressedChange={onChange}
        aria-label={title}
        className="size-12 rounded-full bg-muted text-muted-foreground hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground"
      >
        <Icon className="size-5" />
      </Toggle>
    </div>
  )
}
