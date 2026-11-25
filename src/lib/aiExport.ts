// Export als Markdown, den du direkt in eine KI (Claude, ChatGPT …) geben kannst.
import { HIP_ITEMS, HIP_TYPE_LABEL } from "@/data/hip"
import { MUSCLE_LABEL, STRENGTH_UNITS, UNITS } from "@/data/plan"
import { ONSET_LABEL, bedtimeFrom } from "@/data/sleep"
import { db, getSettings } from "./db"
import { todayISO } from "./dates"
import { shareFile } from "./backup"
import { plannedWeeklySets } from "./volume"
import { variantName } from "./workout"

const n = (v: number) => String(Math.round(v * 10) / 10).replace(".", ",")

export async function buildAiExport(): Promise<string> {
  const [settings, sessions, sets, bodyweight, cardio, hipLogs, sleepLogs] = await Promise.all([
    getSettings(),
    db.sessions.where("status").equals("done").sortBy("startedAt"),
    db.sets.toArray(),
    db.bodyweight.orderBy("date").toArray(),
    db.cardio.toArray(),
    db.hip.orderBy("date").toArray(),
    db.sleep.orderBy("date").toArray(),
  ])
  const today = todayISO()
  const age = settings.birthYear ? Number(today.slice(0, 4)) - settings.birthYear : null
  const L: string[] = []

  L.push(`# Meine Trainingsdaten (Export vom ${today})`)
  L.push("")
  L.push("Bitte werte diese Daten aus: Fortschritt je Übung, Volumen pro Muskel, Erholung, Schwachstellen.")
  L.push("Schlag konkrete Änderungen am Plan vor und begründe sie mit dem aktuellen Forschungsstand (mit Quellen).")
  L.push("")
  L.push("## Profil")
  L.push(`- Geschlecht: männlich${age ? `, Alter: ${age}` : ""}`)
  const bw = bodyweight.at(-1)
  if (bw) L.push(`- Körpergewicht zuletzt: ${n(bw.kg)} kg (${bw.date}), ${bodyweight.length} Messungen`)
  L.push("- Ziel: Muskelaufbau, Gesundheit und Langlebigkeit, gute Erholung")
  L.push("")
  L.push("## Plan")
  L.push("Rotation Push A → Pull A → Beine A → Erholung (Zone 2) → Push B → Pull B → Beine B → Erholung (Intervalle).")
  L.push("A-Tage schwer, B-Tage moderat. RIR = Wiederholungen, die noch gegangen wären.")
  L.push("Progression: +1 Stufe, wenn alle Sätze oben im Bereich; −7,5 % nach zweimal unterem Rand verfehlt; Entlastungswoche, wenn Grundübungen fallen.")
  for (const u of STRENGTH_UNITS) {
    L.push(`- **${u.name}**: ${u.exercises.map((e, i) => `${variantName(`gym:${settings.swaps[`${u.id}:${i}`] ?? e.gym.exId}`)} ${e.sets}×${e.reps[0]}–${e.reps[1]}`).join("; ")}`)
  }
  const weekly = plannedWeeklySets(settings.volumeBonus)
  L.push(`- Geplante Sätze pro Woche: ${Object.entries(weekly).map(([m, v]) => `${MUSCLE_LABEL[m as keyof typeof MUSCLE_LABEL]} ${n(v)}`).join(", ")}`)
  if (settings.deloadWeek) L.push(`- Entlastungswoche geplant ab ${settings.deloadWeek}`)
  L.push("")

  L.push("## Einheiten")
  for (const s of sessions) {
    const mins = s.endedAt ? Math.round((s.endedAt - s.startedAt) / 60_000) : null
    const unit = UNITS[s.unit]
    const flags = [s.mode === "gym" ? "Gym" : "Home", s.deload && "Entlastung", s.reentry && "Wiedereinstieg"].filter(Boolean).join(", ")
    L.push(`### ${s.date} · ${unit?.name ?? s.unit} (${flags}${mins !== null ? `, ${mins} min` : ""})`)
    if (unit?.type === "cardio") {
      const c = cardio.find((x) => x.sessionId === s.id)
      L.push(`- Cardio: ${c?.minutes ?? mins ?? "?"} min`)
      continue
    }
    const mine = sets.filter((x) => x.sessionId === s.id).sort((a, b) => a.exIdx - b.exIdx || a.setNo - b.setNo)
    const byKey = new Map<string, typeof mine>()
    for (const x of mine) byKey.set(x.key, [...(byKey.get(x.key) ?? []), x])
    for (const [key, list] of byKey) {
      L.push(`- ${variantName(key)}: ${list.map((x) => `${x.kg > 0 ? `${n(x.kg)} kg × ` : ""}${x.reps}${x.rir != null ? ` (RIR ${x.rir})` : ""}`).join(", ")}`)
    }
  }
  L.push("")
  if (bodyweight.length) {
    L.push("## Körpergewicht")
    L.push(bodyweight.map((b) => `${b.date}: ${n(b.kg)} kg`).join(" · "))
  }
  if (settings.hip) {
    L.push("")
    L.push("## Schnappende Hüfte")
    L.push(`- Typ: ${HIP_TYPE_LABEL[settings.hip.type]}${settings.hip.since ? `, Programm seit ${settings.hip.since}` : ""}`)
    L.push("- Programm: Mobilität täglich, Kraft an Pull- und Erholungstagen, Aktivierung vor dem Beintraining")
    const SNAP = ["kein", "selten", "oft"]
    const name = (id: string) => HIP_ITEMS.find((i) => i.id === id)?.name ?? id
    for (const h of hipLogs) {
      const rating = [h.snap !== undefined && `Schnappen ${SNAP[h.snap]}`, h.pain && "Schmerz"].filter(Boolean).join(", ")
      L.push(`- ${h.date}: ${rating || "keine Bewertung"}${h.done.length ? `; erledigt: ${h.done.map(name).join(", ")}` : ""}`)
    }
  }
  L.push("")
  L.push("## Schlaf & Regeneration")
  const sc = settings.sleepConfig
  L.push(`- Ziel: ${bedtimeFrom(sc.wakeTime, sc.sleepHours)}–${sc.wakeTime} Uhr (${n(sc.sleepHours)} h im Bett), Problem: schweres Einschlafen`)
  if (sleepLogs.length) {
    const QUAL = ["", "schlecht", "mittel", "erholt"]
    for (const s of sleepLogs) {
      const info = [s.onset !== undefined && `eingeschlafen nach ${ONSET_LABEL[s.onset]} min`, s.hours !== undefined && `${n(s.hours)} h`, s.quality && QUAL[s.quality], s.done.length && `${s.done.length} Routine-Schritte`].filter(Boolean).join(", ")
      if (info) L.push(`- ${s.date}: ${info}`)
    }
  }
  return L.join("\n")
}

export async function exportForAi() {
  await shareFile(`workout-ki-export-${todayISO()}.md`, await buildAiExport(), "text/markdown", "Trainingsdaten für KI")
}
