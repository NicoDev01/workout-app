// Vergleichswerte für Männer nach Alter. Quellen stehen bei den Daten und werden in der App angezeigt.

/**
 * Bankdrücken 1RM ÷ Körpergewicht, Männer, Perzentile 5/25/50/75/95.
 * Cooper Institute (2013), Physical Fitness Assessments and Norms for Adults and Law Enforcement.
 * Gemessen an einer Maschine (Universal DVR) bei Cooper-Clinic-Patienten, daher nur grobe Orientierung.
 * Werte übernommen von fitnessnorms.pages.dev (Aufbereitung der Cooper-Tabellen).
 */
const BENCH: { from: number; p: [number, number, number, number, number] }[] = [
  { from: 0, p: [0.72, 0.9, 1.06, 1.26, 1.63] },
  { from: 30, p: [0.65, 0.81, 0.93, 1.08, 1.35] },
  { from: 40, p: [0.59, 0.74, 0.84, 0.96, 1.2] },
  { from: 50, p: [0.53, 0.66, 0.75, 0.87, 1.05] },
  { from: 60, p: [0.49, 0.6, 0.68, 0.79, 0.94] },
]
const PCT = [5, 25, 50, 75, 95]

export function benchNorms(age: number) {
  return [...BENCH].reverse().find((b) => age >= b.from)!.p
}

/** Perzentil eines Verhältnisses, linear zwischen den Stützstellen, begrenzt auf 1–99 */
export function benchPercentile(ratio: number, age: number): number {
  const p = benchNorms(age)
  if (ratio <= p[0]) return Math.max(1, Math.round((ratio / p[0]) * 5))
  if (ratio >= p[4]) return Math.min(99, Math.round(95 + ((ratio - p[4]) / (p[4] - p[3])) * 20))
  for (let i = 0; i < 4; i++) {
    if (ratio <= p[i + 1]) return Math.round(PCT[i] + ((ratio - p[i]) / (p[i + 1] - p[i])) * (PCT[i + 1] - PCT[i]))
  }
  return 50
}

/**
 * Durchschnittliches Körpergewicht von Männern in Deutschland nach Alter (kg).
 * Destatis, Mikrozensus 2025 (Erstergebnisse), Tabelle „Körpermaße Männer“.
 */
const WEIGHT: [number, number][] = [
  [18, 76.7], [20, 81.2], [25, 84.0], [30, 86.2], [35, 87.4], [40, 88.5], [45, 89.7],
  [50, 89.6], [55, 89.7], [60, 88.8], [65, 87.6], [70, 86.1], [75, 81.1],
]

export function avgWeight(age: number): number {
  return [...WEIGHT].reverse().find(([from]) => age >= from)?.[1] ?? WEIGHT[0][1]
}

/** Anteil der Männer, die mindestens 2× pro Woche Muskeln kräftigen (RKI, GEDA 2014/2015) */
export const STRENGTH_2X_SHARE = 31

export const NORM_SOURCES = [
  { label: "Bankdrücken: Cooper Institute 2013", url: "https://fitnessnorms.pages.dev/strength/cooper-bench-press" },
  { label: "Körpergewicht: Destatis, Mikrozensus 2025", url: "https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Gesundheit/Gesundheitszustand-Relevantes-Verhalten/Tabellen/koerpermasse-maenner.html" },
  { label: "Krafttraining: RKI, GEDA 2014/2015", url: "https://edoc.rki.de/bitstream/handle/176904/2650/20m7pbUeDqZ2.pdf" },
]
