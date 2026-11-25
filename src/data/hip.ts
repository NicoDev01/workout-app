// Begleitprogramm bei schnappender Hüfte (Coxa saltans). Keine Imports, damit das Build-Skript die Datei laden kann.
// Grundlage: konservative Behandlung = Dehnen der betroffenen Sehne, Kräftigung von Gesäß/Hüftabduktoren,
// Rumpf- und Beckenstabilität, provozierende Bewegungen meiden (Walker et al. 2021, Orthop Rev 13(2); Physiopedia).

/** external = außen über dem Rollhügel (IT-Band/Gesäß), internal = vorne in der Leiste (Iliopsoas-Sehne) */
export type HipType = "external" | "internal" | "unknown"
export type HipBlock = "mobility" | "activation" | "strength"

export interface HipItem {
  id: string
  exId: string
  name: string
  dose: string
  block: HipBlock
  types: HipType[]
  cue: string
}

const ALL: HipType[] = ["external", "internal", "unknown"]

export const HIP_ITEMS: HipItem[] = [
  // Mobilität: täglich, ca. 5 min
  {
    id: "m-flexor",
    exId: "kneeling-hip-flexor-stretch",
    name: "Hüftbeuger-Dehnung kniend",
    dose: "2 × 30 s je Seite",
    block: "mobility",
    types: ALL,
    cue: "Po anspannen und Becken nach hinten kippen, dann leicht nach vorn schieben. Dehnung vorn in der Leiste, kein Hohlkreuz.",
  },
  {
    id: "m-itband",
    exId: "banded-it-band-stretch",
    name: "IT-Band-Dehnung mit Band",
    dose: "2 × 30 s je Seite",
    block: "mobility",
    types: ["external", "unknown"],
    cue: "Bein mit dem Band über die Körpermitte ziehen, bis es außen an Hüfte und Oberschenkel zieht. Ruhig weiteratmen.",
  },
  {
    id: "m-pigeon",
    exId: "pigeon-stretch",
    name: "Tauben-Dehnung",
    dose: "2 × 30 s je Seite",
    block: "mobility",
    types: ["external", "unknown"],
    cue: "Dehnt Gesäß und Hüftaußenseite. Becken gerade halten, Oberkörper aufrecht oder nach vorn abgelegt.",
  },
  {
    id: "m-rock",
    exId: "half-kneeling-hip-flexor-rock",
    name: "Hüftbeuger-Wippen",
    dose: "1 × 10 je Seite",
    block: "mobility",
    types: ["internal", "unknown"],
    cue: "Langsam vor und zurück wippen, nur so weit, wie es ohne Schnappen geht.",
  },

  // Aktivierung: an Beintagen vor dem Aufwärmen, ca. 4 min
  {
    id: "a-walk",
    exId: "banded-lateral-walk",
    name: "Seitwärtsgehen mit Band",
    dose: "2 × 10 Schritte je Richtung",
    block: "activation",
    types: ALL,
    cue: "Leicht in die Knie, Band über den Knien oder Knöcheln. Kleine Schritte, Knie nicht nach innen fallen lassen.",
  },
  {
    id: "a-bridge",
    exId: "glute-bridge",
    name: "Glute Bridge",
    dose: "2 × 12",
    block: "activation",
    types: ALL,
    cue: "Mit dem Po hochdrücken, nicht mit dem unteren Rücken. Oben 2 s halten.",
  },

  // Kraft: jeden 2. Tag ohne Beintraining, ca. 12 min
  {
    id: "s-abduction",
    exId: "side-lying-hip-abduction",
    name: "Seitliches Beinheben liegend",
    dose: "3 × 15 je Seite",
    block: "strength",
    types: ALL,
    cue: "Bein leicht nach hinten, Zehen zeigen nach vorn. Hoch in 1 s, ablassen in 3 s. Trifft den mittleren Gesäßmuskel.",
  },
  {
    id: "s-clam",
    exId: "clamshells",
    name: "Clamshells",
    dose: "2 × 15 je Seite",
    block: "strength",
    types: ALL,
    cue: "Füße bleiben zusammen, Becken kippt nicht nach hinten. Mit Band, sobald 15 Wdh leicht gehen.",
  },
  {
    id: "s-walk",
    exId: "banded-lateral-walk",
    name: "Seitwärtsgehen mit Band",
    dose: "3 × 12 Schritte je Richtung",
    block: "strength",
    types: ALL,
    cue: "Spannung im Band halten, Oberkörper ruhig. Stärkeres Band, wenn es leicht wird.",
  },
  {
    id: "s-bridge",
    exId: "single-leg-glute-bridge",
    name: "Einbeinige Glute Bridge",
    dose: "3 × 10 je Seite",
    block: "strength",
    types: ALL,
    cue: "Becken bleibt waagerecht, oben 2 s halten. Bei Schnappen das freie Bein angewinkelt lassen.",
  },
  {
    id: "s-stand",
    exId: "supported-single-leg-stand",
    name: "Einbeinstand",
    dose: "3 × 30 s je Seite",
    block: "strength",
    types: ["external", "unknown"],
    cue: "Becken waagerecht, Knie leicht gebeugt. Steigerung: ohne Halt, dann mit geschlossenen Augen.",
  },
  {
    id: "s-sideplank",
    exId: "side-plank",
    name: "Seitstütz",
    dose: "3 × 20–40 s je Seite",
    block: "strength",
    types: ALL,
    cue: "Körper in einer Linie, Hüfte hoch. Einstieg auf den Knien, wenn 20 s nicht sauber gehen.",
  },
  {
    id: "s-deadbug",
    exId: "dead-bug",
    name: "Dead Bug",
    dose: "3 × 8 je Seite",
    block: "strength",
    types: ["internal", "unknown"],
    cue: "Unterer Rücken bleibt am Boden. Bein nur so weit strecken, wie es ohne Schnappen geht.",
  },
]

export const HIP_BLOCK_LABEL: Record<HipBlock, string> = {
  mobility: "Mobilität · täglich",
  activation: "Aktivierung · vor dem Beintraining",
  strength: "Kraft · jeden 2. Tag",
}

export const HIP_TYPE_LABEL: Record<HipType, string> = {
  external: "Außen",
  internal: "Vorne",
  unknown: "Unklar",
}

export const HIP_TYPE_HELP: Record<HipType, string> = {
  external: "Schnappt seitlich am Hüftknochen, oft sicht- oder tastbar, z. B. beim Gehen oder Treppensteigen.",
  internal: "Klackt vorn in der Leiste, oft hörbar, z. B. beim Absenken des Beins aus der Beugung.",
  unknown: "Beide Formen werden abgedeckt.",
}

export function hipExerciseIds(): string[] {
  return [...new Set(HIP_ITEMS.map((i) => i.exId))]
}

/** Welche Blöcke an einem Tag dran sind. unit = geplante Einheit, null = Ruhetag. */
export function hipBlocksFor(unit: string | null): HipBlock[] {
  if (unit === "legsA" || unit === "legsB") return ["mobility", "activation"]
  if (unit === "pushA" || unit === "pushB") return ["mobility"]
  // Pull-Tage und Erholungstage: Kraftblock, so liegt er alle 2 Tage und nie direkt vor oder an Beintagen
  return ["mobility", "strength"]
}

export function hipItemsFor(unit: string | null, type: HipType): HipItem[] {
  const blocks = hipBlocksFor(unit)
  return HIP_ITEMS.filter((i) => blocks.includes(i.block) && i.types.includes(type))
}

/** Übungen im Hauptplan, die Schnappen auslösen können */
export const HIP_RISK: Record<string, { types: HipType[]; text: string }> = Object.fromEntries([
  ...["hanging-leg-raise", "captains-chair-leg-raise", "captains-chair-knee-raise", "lying-leg-raise", "ab-wheel-rollout", "barbell-ab-rollout", "plank-knee-tuck", "reverse-crunches"].map((id) => [
    id,
    { types: ["internal", "unknown"] as HipType[], text: "Viel Hüftbeugung, kann vorn in der Leiste schnappen. Beine langsam absenken, Bewegung kleiner halten. Hüftschonend: Dead Bug." },
  ]),
  ...["bulgarian-split-squat", "barbell-bulgarian-split-squat", "step-ups", "reverse-lunge", "db-lunge", "walking-lunge"].map((id) => [
    id,
    { types: ["external", "unknown"] as HipType[], text: "Einbeinig, kann seitlich an der Hüfte schnappen. Knie über dem Fuß halten, Becken waagerecht, Tiefe anpassen." },
  ]),
])

export const HIP_INFO = {
  what: "Coxa saltans: Eine Sehne springt bei Bewegung über einen Knochenvorsprung. Bei 5–10 % aller Menschen kommt das ohne Beschwerden vor. Schmerzfreies Schnappen ist meist harmlos. Behandelt wird zuerst konservativ: provozierende Bewegungen reduzieren, betroffene Strukturen dehnen, Gesäß, Hüftabduktoren und Rumpf kräftigen. Die meisten Fälle bessern sich so innerhalb von 6–12 Monaten.",
  dose: "Leichtes Schnappen ohne Schmerz während der Übungen ist okay. Schmerz höchstens 3 von 10 und am nächsten Tag nicht schlechter. Sonst Bewegung kleiner machen oder Übung weglassen.",
  redFlags: [
    "Schmerz, der bleibt oder zunimmt",
    "Hüfte blockiert, knickt weg oder fühlt sich instabil an",
    "Schnappen begann nach einem Sturz oder Unfall",
    "Schmerz in Ruhe oder nachts",
    "Nach 2–3 Monaten Übungen keine Besserung",
  ],
}

export const HIP_SOURCES = [
  { label: "Walker et al. 2021, Orthopedic Reviews", url: "https://orthopedicreviews.openmedicalpublishing.org/article/25088-snapping-hip-syndrome-a-comprehensive-update" },
  { label: "Physiopedia: Snapping Hip Syndrome", url: "https://www.physio-pedia.com/Snapping_Hip_Syndrome" },
  { label: "HSS: Snapping Hip Syndrome", url: "https://www.hss.edu/health-library/move-better/snapping-hip-syndrome" },
]
