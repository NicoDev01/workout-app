// Schlafroutine: kurze Handlungen zur richtigen Uhrzeit, ausgerichtet auf Einschlafprobleme (CBT-I).
// Leitlinien: CBT-I ist erste Wahl bei Insomnie, Schlafhygiene allein reicht nicht (AASM 2021, Riemann et al. 2023).

export type SleepQuality = 1 | 2 | 3
/** Einschlafdauer: 0 = unter 15 min, 1 = 15–30, 2 = 30–60, 3 = über 60 min */
export type SleepOnset = 0 | 1 | 2 | 3

export interface SleepConfig {
  /** Aufstehzeit "HH:MM", jeden Tag gleich */
  wakeTime: string
  /** Schlaffenster in Stunden */
  sleepHours: number
  /** Tägliche Erinnerungen */
  notifications: boolean
  /** Datum der letzten Bettzeit-Verschiebung */
  compressedAt?: string
}

export interface SleepLog {
  date: string
  /** Erledigte Schritte des Tages */
  done: string[]
  /** Geschlafene Stunden der letzten Nacht */
  hours?: number
  /** 1 = schlecht, 2 = mittel, 3 = erholt */
  quality?: SleepQuality
  onset?: SleepOnset
}

export const DEFAULT_SLEEP_CONFIG: SleepConfig = {
  wakeTime: "06:30",
  sleepHours: 8,
  notifications: true,
}

/** Kürzestes Schlaffenster, das die App ohne Therapeut vorschlägt */
export const MIN_SLEEP_HOURS = 6.5

export const ONSET_LABEL = ["< 15", "15–30", "30–60", "> 60"] as const

export interface SleepStep {
  id: string
  /** Uhrzeit "HH:MM" */
  time: string
  /** Minuten seit 00:00 */
  minutesOfDay: number
  title: string
  short: string
  /** Tägliche Erinnerung (Android) */
  notify?: { id: number; title: string; body: string }
}

/** Was tun, wenn du wach im Bett liegst (Stimuluskontrolle) */
export const AWAKE_IN_BED = [
  "Nach ca. 15 min wach aufstehen. Nicht auf die Uhr schauen.",
  "Anderes Zimmer, schwaches Licht, etwas Ruhiges. Kein Handy.",
  "Erst zurück ins Bett, wenn die Augen zufallen. So oft wie nötig.",
  "Morgens trotzdem zur festen Zeit aufstehen.",
]

/** Gilt den ganzen Tag */
export const DAY_RULES = ["Kein Nickerchen", "Bett nur zum Schlafen", "Kein Alkohol am Abend"]

const pad = (n: number) => String(n).padStart(2, "0")
const norm = (m: number) => ((Math.round(m) % 1440) + 1440) % 1440

export function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return norm((h || 0) * 60 + (m || 0))
}

export function formatMinutesToTime(mins: number): string {
  const n = norm(mins)
  return `${pad(Math.floor(n / 60))}:${pad(n % 60)}`
}

export function shiftTime(hhmm: string, deltaMinutes: number): string {
  return formatMinutesToTime(parseTimeToMinutes(hhmm) + deltaMinutes)
}

/** Schlafenszeit aus Aufstehzeit und Schlaffenster */
export function bedtimeFrom(wakeTime: string, sleepHours: number): string {
  return shiftTime(wakeTime, -Math.round(sleepHours * 60))
}

/**
 * Tagesplan in zeitlicher Reihenfolge.
 * @param unitId heutige Einheit; bei harter Einheit kommt "Training beenden" dazu
 */
export function buildSleepRoutine(config: SleepConfig, unitId?: string | null): SleepStep[] {
  const wake = parseTimeToMinutes(config.wakeTime)
  const bed = parseTimeToMinutes(bedtimeFrom(config.wakeTime, config.sleepHours))
  const at = (m: number) => ({ time: formatMinutesToTime(m), minutesOfDay: norm(m) })
  const hard = !!unitId && unitId !== "cooldown" && unitId !== "zone2"

  const steps: SleepStep[] = [
    {
      id: "wake-light",
      ...at(wake),
      title: "Aufstehen, auch am Wochenende",
      short: "Direkt 15 min raus ins Tageslicht.",
      notify: { id: 301, title: "Aufstehen", body: "Jetzt raus: 15 min Tageslicht." },
    },
    {
      // Gardiner et al. 2023: ~100 mg Koffein mind. 8,8 h vor dem Schlafen
      id: "caffeine-cutoff",
      ...at(bed - 9 * 60),
      title: "Letzter Kaffee",
      short: "Danach nichts mit Koffein.",
    },
  ]
  if (hard) {
    // Stutz et al. 2019: hartes Training bis 1 h vorher kann das Einschlafen stören; bei Problemen früher
    steps.push({ id: "training-end", ...at(bed - 3 * 60), title: "Hartes Training beendet", short: "Später nur noch locker bewegen." })
  }
  steps.push(
    {
      id: "last-meal",
      ...at(bed - 3 * 60),
      title: "Letzte große Mahlzeit",
      short: "Danach kein Alkohol, nur noch wenig trinken.",
      notify: { id: 302, title: "Letzte große Mahlzeit", body: "Jetzt essen. Danach kein Alkohol." },
    },
    {
      // Haghayegh et al. 2019: warm duschen oder baden 1–2 h vor dem Schlafen
      id: "warm-shower",
      ...at(bed - 90),
      title: "Warm duschen",
      short: "Schlafzimmer lüften, kühl und dunkel.",
      notify: { id: 303, title: "Warm duschen", body: "10 min warm duschen, Schlafzimmer lüften." },
    },
    {
      id: "wind-down",
      ...at(bed - 60),
      title: "Licht dimmen, Handy weg",
      short: "5 min: To-dos für morgen auf Papier.",
      notify: { id: 304, title: "Licht dimmen, Handy weg", body: "To-dos für morgen aufschreiben, dann runterfahren." },
    },
    {
      id: "lights-out",
      ...at(bed),
      title: "Ins Bett, wenn du müde bist",
      short: "Nicht früher. Licht aus, Uhr wegdrehen.",
      notify: { id: 305, title: "Schlafenszeit", body: "Ins Bett, wenn du müde bist. Uhr wegdrehen." },
    },
  )
  return steps
}

/** Nächster anstehender Schritt (Minuten seit 00:00) */
export function nextSleepStep(steps: SleepStep[], nowMinutes: number): { step: SleepStep; inMinutes: number } {
  const sorted = [...steps].sort((a, b) => a.minutesOfDay - b.minutesOfDay)
  const s = sorted.find((x) => x.minutesOfDay >= nowMinutes)
  if (s) return { step: s, inMinutes: s.minutesOfDay - nowMinutes }
  return { step: sorted[0], inMinutes: 1440 - nowMinutes + sorted[0].minutesOfDay }
}

/** Liegt die Uhrzeit im Schlaffenster (Schlafenszeit bis Aufstehen)? */
export function isNight(config: SleepConfig, nowMinutes: number): boolean {
  const bed = parseTimeToMinutes(bedtimeFrom(config.wakeTime, config.sleepHours))
  const wake = parseTimeToMinutes(config.wakeTime)
  return bed > wake ? nowMinutes >= bed || nowMinutes < wake : nowMinutes >= bed && nowMinutes < wake
}

/**
 * Schlafkompression (Teil der CBT-I): Wer oft lange wach liegt, verkürzt die Zeit im Bett.
 * Mind. 4 der letzten 7 Nächte über 30 min Einschlafdauer → Bettzeit 30 min später.
 * Danach zählen nur Nächte nach der Verschiebung, also frühestens nach einer Woche wieder.
 */
export function shouldCompress(logs: SleepLog[], config: SleepConfig): boolean {
  if (config.sleepHours - 0.5 < MIN_SLEEP_HOURS) return false
  const last = logs
    .filter((l) => !config.compressedAt || l.date > config.compressedAt)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
  return last.filter((l) => (l.onset ?? 0) >= 2).length >= 4
}

/** Kurze Trainingsempfehlung nach der letzten Nacht */
export function trainingAdviceFromSleep(log?: SleepLog): { status: "optimal" | "caution" | "warning"; text: string } | null {
  if (!log || (log.hours === undefined && log.quality === undefined)) return null
  const hours = log.hours ?? 7.5
  const quality = log.quality ?? 2
  // Craven et al. 2022: Schlafmangel verschlechtert vor allem die Leistung über mehrere Sätze
  if (hours < 6 || quality === 1) return { status: "warning", text: "Heute trainieren, aber 1 Wdh mehr Puffer und kein Satz bis zum Versagen." }
  if (hours < 7 || quality === 2) return { status: "caution", text: "Normal trainieren. Heute Abend pünktlich ins Bett." }
  return { status: "optimal", text: "Gut erholt: volle Sätze." }
}

export const SLEEP_SOURCES = [
  { label: "Edinger et al. 2021, AASM-Leitlinie Insomnie", url: "https://aasm.org/new-guideline-supports-behavioral-psychological-treatments-for-insomnia/" },
  { label: "Riemann et al. 2023, Europäische Insomnie-Leitlinie", url: "https://doi.org/10.1111/jsr.14035" },
  { label: "Gardiner et al. 2023, Koffein und Schlaf", url: "https://pubmed.ncbi.nlm.nih.gov/36870101/" },
  { label: "Haghayegh et al. 2019, Warm duschen vor dem Schlafen", url: "https://doi.org/10.1016/j.smrv.2019.04.008" },
  { label: "Stutz et al. 2019, Abendtraining und Schlaf", url: "https://pubmed.ncbi.nlm.nih.gov/30374942/" },
  { label: "Craven et al. 2022, Schlafmangel und Leistung", url: "https://doi.org/10.1007/s40279-022-01706-y" },
]
