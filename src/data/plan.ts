// Trainingsplan als Code (Plan v3: Push/Pull/Beine-Rotation mit A/B-Varianten).
// Keine Imports, damit das Build-Skript die Datei direkt laden kann.

export type Mode = "gym" | "home"
export type Load = "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "rucksack"
export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "reardelts"
  | "traps"
  | "triceps"
  | "biceps"
  | "forearms"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "adductors"
  | "calves"
  | "abs"
  | "lowerback"

export type Range = [number, number]

export interface Variant {
  exId: string
  name: string
  load: Load
  /** Home: eigener Wiederholungsbereich */
  reps?: Range
  /** Keine Zusatzlast möglich, Progression nur über Wiederholungen */
  noLoad?: boolean
}

export interface PlanExercise {
  gym: Variant
  home: Variant
  /** Ersatz, wenn zu Hause verstellbare Kurzhanteln vorhanden sind */
  homeDb?: Variant
  /** Gym-Alternativen, falls ein Gerät fehlt oder belegt ist */
  alts?: Variant[]
  sets: number
  reps: Range
  rir: Range
  rest: number
  perSide?: boolean
  primary: MuscleGroup
  secondary: MuscleGroup[]
}

export type StrengthId = "pushA" | "pullA" | "legsA" | "pushB" | "pullB" | "legsB"
export type CardioId = "zone2" | "intervals" | "cooldown"
export type UnitId = StrengthId | CardioId

export interface StrengthUnit {
  id: StrengthId
  type: "strength"
  name: string
  focus: string
  minutes: number
  exercises: PlanExercise[]
}

export interface CardioPhase {
  label: string
  minutes: number
  hard?: boolean
}

export interface CardioUnit {
  id: CardioId
  type: "cardio"
  name: string
  focus: string
  minutes: number
  gym: { exId: string; text: string }
  home: { exId: string; text: string }
  description: string
  phases: CardioPhase[]
}

export type Unit = StrengthUnit | CardioUnit

const g = (exId: string, name: string, load: Load, extra: Partial<Variant> = {}): Variant => ({ exId, name, load, ...extra })
const h = (exId: string, name: string, reps: Range, extra: Partial<Variant> = {}): Variant => ({ exId, name, load: "rucksack", reps, ...extra })

// A-Tage: schwer (Grundübungen 6–10 Wdh, lange Pausen). B-Tage: moderat (8–15 Wdh), andere Übungen und Winkel.

const pushA: StrengthUnit = {
  id: "pushA",
  type: "strength",
  name: "Push A",
  focus: "Brust, Schultern, Trizeps · schwer",
  minutes: 60,
  exercises: [
    { gym: g("bench-press", "Bankdrücken", "barbell"), home: h("weighted-dips", "Dips mit Rucksack", [8, 15]), sets: 3, reps: [6, 8], rir: [1, 2], rest: 180, primary: "chest", secondary: ["triceps", "shoulders"], alts: [g("db-bench-press", "KH-Bankdrücken", "dumbbell"), g("chest-press-machine", "Brustpresse Maschine", "machine"), g("smith-machine-bench-press", "Bankdrücken Multipresse", "barbell")] },
    { gym: g("dumbbell-shoulder-press", "KH-Schulterdrücken sitzend", "dumbbell"), home: h("pike-push-ups", "Pike-Liegestütz", [8, 15]), homeDb: g("dumbbell-shoulder-press", "KH-Schulterdrücken", "dumbbell", { reps: [8, 12] }), sets: 3, reps: [8, 10], rir: [1, 1], rest: 120, primary: "shoulders", secondary: ["triceps"], alts: [g("machine-shoulder-press", "Schulterdrücken Maschine", "machine"), g("seated-smith-machine-shoulder-press", "Schulterdrücken Multipresse", "barbell")] },
    { gym: g("cable-fly", "Kabel-Fly von unten nach oben", "cable"), home: h("wide-grip-push-ups", "Weite Liegestütz", [12, 20]), sets: 2, reps: [12, 15], rir: [0, 1], rest: 90, primary: "chest", secondary: [], alts: [g("machine-chest-fly", "Butterfly-Maschine", "machine"), g("incline-dumbbell-fly", "Schrägbank-Flys KH", "dumbbell")] },
    { gym: g("cable-lateral-raise", "Seitheben am Kabel", "cable"), home: h("lateral-raise", "Einarmiges Rucksack-Seitheben", [12, 20]), homeDb: g("lateral-raise", "KH-Seitheben", "dumbbell", { reps: [12, 20] }), sets: 4, reps: [12, 15], rir: [0, 1], rest: 90, primary: "shoulders", secondary: [], alts: [g("lateral-raise", "Seitheben KH", "dumbbell"), g("plate-loaded-lateral-raise", "Seitheben Maschine", "machine")] },
    { gym: g("cable-overhead-tricep-extension", "Überkopf-Trizepsstrecken am Kabel", "cable"), home: h("trx-tricep-extension", "Trizepsstrecken an der Dip-Stange", [10, 20], { noLoad: true }), sets: 3, reps: [10, 12], rir: [0, 1], rest: 90, primary: "triceps", secondary: [], alts: [g("ez-bar-overhead-extension", "Überkopf-Trizepsdrücken SZ", "barbell"), g("single-arm-dumbbell-overhead-tricep-extension", "Einarmiges Überkopfstrecken KH", "dumbbell")] },
    { gym: g("tricep-pushdown", "Trizepsdrücken am Kabel", "cable"), home: h("close-grip-push-ups", "Enge Liegestütz", [10, 20]), sets: 2, reps: [12, 15], rir: [0, 1], rest: 90, primary: "triceps", secondary: [], alts: [g("v-bar-tricep-pushdown", "Trizepsdrücken V-Griff", "cable"), g("machine-triceps-extension", "Trizepsmaschine", "machine")] },
    { gym: g("cable-crunch", "Kabel-Crunch", "cable"), home: h("reverse-crunches", "Reverse Crunches", [12, 20], { noLoad: true }), sets: 3, reps: [10, 15], rir: [1, 1], rest: 60, primary: "abs", secondary: [], alts: [g("machine-seated-crunch", "Bauchmaschine", "machine"), g("decline-crunch", "Negativbank-Crunch", "bodyweight", { noLoad: true, reps: [12, 20] })] },
  ],
}

const pullA: StrengthUnit = {
  id: "pullA",
  type: "strength",
  name: "Pull A",
  focus: "Rücken, Bizeps, Nacken · schwer",
  minutes: 60,
  exercises: [
    { gym: g("pull-up", "Klimmzüge, ab 10 Wdh mit Gewicht", "bodyweight"), home: h("pull-up", "Klimmzüge", [6, 12]), sets: 3, reps: [6, 10], rir: [1, 1], rest: 150, primary: "back", secondary: ["biceps"], alts: [g("neutral-grip-pull-ups", "Klimmzüge Neutralgriff", "bodyweight"), g("close-grip-lat-pulldown", "Enger Latzug", "cable", { reps: [8, 12] })] },
    { gym: g("chest-supported-machine-row", "Brustgestütztes Rudern", "machine"), home: h("single-arm-db-row", "Einarmiges Rucksack-Rudern", [10, 20]), homeDb: g("single-arm-db-row", "Einarmiges KH-Rudern", "dumbbell", { reps: [8, 15] }), sets: 3, reps: [6, 8], rir: [1, 2], rest: 180, primary: "back", secondary: ["reardelts", "biceps"], alts: [g("chest-supported-db-row", "Brustgestütztes KH-Rudern", "dumbbell"), g("barbell-row", "Langhantelrudern vorgebeugt", "barbell"), g("chest-supported-smith-machine-row", "Brustgestütztes Rudern Multipresse", "barbell")] },
    { gym: g("v-bar-lat-pulldown", "Latzug, neutraler Griff", "cable"), home: h("chin-ups", "Chin-ups, 4 s ablassen", [6, 10]), sets: 2, reps: [10, 12], rir: [1, 1], rest: 120, primary: "back", secondary: ["biceps"], alts: [g("reverse-grip-lat-pulldown", "Latzug Untergriff", "cable"), g("one-arm-lat-pulldown", "Einarmiger Latzug", "cable")] },
    { gym: g("face-pull", "Face Pull am Kabel", "cable"), home: h("dumbbell-reverse-fly", "Vorgebeugter Rucksack-Reverse-Fly", [15, 25]), homeDb: g("dumbbell-reverse-fly", "KH Reverse Fly", "dumbbell", { reps: [12, 20] }), sets: 3, reps: [12, 20], rir: [0, 1], rest: 90, primary: "reardelts", secondary: ["traps"], alts: [g("machine-reverse-fly", "Reverse Butterfly", "machine"), g("dumbbell-reverse-fly", "Reverse Fly KH", "dumbbell")] },
    { gym: g("incline-db-curl", "Schrägbank-Curl KH", "dumbbell"), home: h("bicep-curl", "Rucksack-Curl", [12, 20]), homeDb: g("incline-db-curl", "Schrägbank-Curl KH", "dumbbell", { reps: [10, 15] }), sets: 3, reps: [8, 12], rir: [0, 1], rest: 90, primary: "biceps", secondary: [], alts: [g("db-preacher-curl", "Preacher Curl KH", "dumbbell"), g("ez-bar-curl", "SZ-Curl", "barbell")] },
    { gym: g("hammer-curl", "Hammer-Curl KH", "dumbbell"), home: h("hammer-curl", "Rucksack-Hammer-Curl", [12, 20]), homeDb: g("hammer-curl", "Hammer-Curl KH", "dumbbell", { reps: [10, 15] }), sets: 2, reps: [10, 12], rir: [0, 1], rest: 90, primary: "biceps", secondary: ["forearms"], alts: [g("cable-hammer-curl", "Hammer-Curl am Kabel", "cable"), g("cross-body-hammer-curl", "Cross-Body-Hammer-Curl", "dumbbell")] },
    { gym: g("db-shrug", "KH-Shrugs", "dumbbell"), home: h("db-shrug", "Rucksack-Shrugs", [15, 25]), homeDb: g("db-shrug", "KH-Shrugs", "dumbbell", { reps: [12, 20] }), sets: 2, reps: [10, 15], rir: [0, 1], rest: 90, primary: "traps", secondary: ["forearms"], alts: [g("shrug", "Langhantel-Shrugs", "barbell"), g("smith-machine-shrug", "Shrugs Multipresse", "barbell")] },
  ],
}

const legsA: StrengthUnit = {
  id: "legsA",
  type: "strength",
  name: "Beine A",
  focus: "Quadrizeps, Beinbeuger, Waden · schwer",
  minutes: 60,
  exercises: [
    { gym: g("squat", "Kniebeuge", "barbell"), home: h("bulgarian-split-squat", "Bulgarian Split Squat mit Rucksack", [10, 20]), homeDb: g("bulgarian-split-squat", "Bulgarian Split Squat KH", "dumbbell", { reps: [8, 12] }), sets: 3, reps: [6, 8], rir: [1, 2], rest: 180, primary: "quads", secondary: ["glutes", "adductors"], alts: [g("hack-squat", "Hackenschmidt", "machine"), g("front-squat", "Frontkniebeuge", "barbell"), g("smith-machine-squat", "Kniebeuge Multipresse", "barbell")] },
    { gym: g("romanian-deadlift", "Rumänisches Kreuzheben", "barbell"), home: h("single-leg-romanian-deadlift", "Einbeiniges RDL mit Rucksack", [10, 15]), homeDb: g("dumbbell-romanian-deadlift", "KH Rumänisches Kreuzheben", "dumbbell", { reps: [8, 12] }), sets: 3, reps: [6, 8], rir: [2, 2], rest: 180, primary: "hamstrings", secondary: ["glutes", "lowerback"], alts: [g("dumbbell-romanian-deadlift", "Rumänisches Kreuzheben KH", "dumbbell"), g("stiff-leg-deadlift", "Kreuzheben gestreckte Beine", "barbell")] },
    { gym: g("seated-leg-curl", "Sitzender Beinbeuger", "machine"), home: h("nordic-hamstring-curl", "Nordic Curl, langsam ablassen", [4, 8], { noLoad: true }), sets: 3, reps: [10, 12], rir: [0, 1], rest: 90, primary: "hamstrings", secondary: [], alts: [g("leg-curl", "Liegender Beinbeuger", "machine"), g("nordic-hamstring-curl", "Nordic Curl", "bodyweight", { noLoad: true, reps: [4, 8] })] },
    { gym: g("leg-extension", "Beinstrecker", "machine"), home: h("sissy-squat", "Sissy Squat", [10, 20], { noLoad: true }), sets: 3, reps: [12, 15], rir: [0, 1], rest: 90, primary: "quads", secondary: [], alts: [g("single-leg-extension", "Beinstrecker einbeinig", "machine")] },
    { gym: g("standing-calf-raise", "Wadenheben stehend", "machine"), home: h("single-leg-calf-raise", "Einbeiniges Wadenheben an der Stufe", [12, 20]), sets: 4, reps: [8, 12], rir: [0, 1], rest: 90, primary: "calves", secondary: [], alts: [g("smith-machine-calf-raise", "Wadenheben Multipresse", "barbell"), g("hack-squat-calf-raise", "Wadenheben Hackenschmidt", "machine")] },
    { gym: g("hanging-leg-raise", "Hängendes Beinheben", "bodyweight", { noLoad: true }), home: h("hanging-leg-raise", "Hängendes Beinheben", [10, 15], { noLoad: true }), sets: 3, reps: [10, 15], rir: [1, 1], rest: 60, primary: "abs", secondary: [], alts: [g("dead-bug", "Dead Bug (hüftschonend)", "bodyweight", { noLoad: true, reps: [8, 12] }), g("captains-chair-leg-raise", "Beinheben am Stütz", "bodyweight", { noLoad: true }), g("lying-leg-raise", "Liegendes Beinheben", "bodyweight", { noLoad: true, reps: [12, 20] })] },
  ],
}

const pushB: StrengthUnit = {
  id: "pushB",
  type: "strength",
  name: "Push B",
  focus: "obere Brust, Schultern, Trizeps · moderat",
  minutes: 60,
  exercises: [
    { gym: g("incline-db-press", "KH-Schrägbankdrücken", "dumbbell"), home: h("deficit-push-ups", "Deficit-Liegestütz mit Rucksack", [10, 20]), sets: 3, reps: [8, 12], rir: [1, 1], rest: 120, primary: "chest", secondary: ["shoulders", "triceps"], alts: [g("incline-bench-press", "Schrägbankdrücken LH", "barbell"), g("smith-machine-incline-bench-press", "Schrägbank Multipresse", "barbell")] },
    { gym: g("dips", "Dips, ab 12 Wdh mit Gewicht", "bodyweight"), home: h("dips", "Dips", [10, 20]), sets: 3, reps: [8, 12], rir: [1, 1], rest: 120, primary: "chest", secondary: ["triceps"], alts: [g("seated-dip-machine", "Dip-Maschine", "machine"), g("decline-bench-press", "Negativbankdrücken", "barbell")] },
    { gym: g("machine-shoulder-press", "Schulterdrücken Maschine", "machine"), home: h("pike-push-ups", "Pike-Liegestütz mit erhöhten Füßen", [8, 15]), sets: 2, reps: [10, 12], rir: [1, 1], rest: 120, primary: "shoulders", secondary: ["triceps"], alts: [g("dumbbell-shoulder-press", "KH-Schulterdrücken", "dumbbell"), g("seated-barbell-overhead-press", "Schulterdrücken LH sitzend", "barbell")] },
    { gym: g("lateral-raise", "Seitheben KH", "dumbbell"), home: h("lateral-raise", "Einarmiges Rucksack-Seitheben", [12, 20]), homeDb: g("lateral-raise", "KH-Seitheben", "dumbbell", { reps: [12, 20] }), sets: 4, reps: [12, 20], rir: [0, 1], rest: 90, primary: "shoulders", secondary: [], alts: [g("cable-lateral-raise", "Seitheben am Kabel", "cable"), g("seated-dumbbell-lateral-raise", "Seitheben KH sitzend", "dumbbell")] },
    { gym: g("machine-chest-fly", "Butterfly-Maschine", "machine"), home: h("wide-grip-push-ups", "Weite Liegestütz, 2 s Pause unten", [12, 20]), sets: 2, reps: [12, 15], rir: [0, 1], rest: 90, primary: "chest", secondary: [], alts: [g("cable-fly", "Kabel-Fly", "cable"), g("db-fly", "Flys KH", "dumbbell")] },
    { gym: g("ez-bar-lying-tricep-extension", "Trizepsdrücken liegend (SZ)", "barbell"), home: h("close-grip-push-ups", "Enge Liegestütz", [10, 20]), sets: 2, reps: [10, 15], rir: [0, 1], rest: 90, primary: "triceps", secondary: [], alts: [g("db-skull-crusher", "Skull Crusher KH", "dumbbell"), g("machine-triceps-extension", "Trizepsmaschine", "machine")] },
    { gym: g("ab-wheel-rollout", "Bauchroller", "bodyweight", { noLoad: true }), home: h("plank-knee-tuck", "Plank mit Knieanziehen", [12, 20], { noLoad: true }), sets: 3, reps: [8, 15], rir: [1, 1], rest: 60, primary: "abs", secondary: [], alts: [g("dead-bug", "Dead Bug (hüftschonend)", "bodyweight", { noLoad: true, reps: [8, 12] }), g("barbell-ab-rollout", "Rollout mit Langhantel", "bodyweight", { noLoad: true }), g("captains-chair-knee-raise", "Knieheben am Stütz", "bodyweight", { noLoad: true, reps: [12, 20] })] },
  ],
}

const pullB: StrengthUnit = {
  id: "pullB",
  type: "strength",
  name: "Pull B",
  focus: "Lat, Rudern, Unterarme · moderat",
  minutes: 60,
  exercises: [
    { gym: g("lat-pulldown", "Latzug breit", "cable"), home: h("wide-grip-pull-ups", "Klimmzüge weit", [6, 12]), sets: 3, reps: [10, 12], rir: [1, 1], rest: 120, primary: "back", secondary: ["biceps"], alts: [g("wide-grip-pull-ups", "Klimmzüge weit", "bodyweight", { reps: [6, 10] }), g("one-arm-lat-pulldown", "Einarmiger Latzug", "cable")] },
    { gym: g("seated-cable-row", "Kabelrudern eng", "cable"), home: h("single-arm-db-row", "Einarmiges Rucksack-Rudern", [10, 20]), homeDb: g("single-arm-db-row", "Einarmiges KH-Rudern", "dumbbell", { reps: [10, 15] }), sets: 3, reps: [10, 12], rir: [1, 1], rest: 120, primary: "back", secondary: ["reardelts", "biceps"], alts: [g("one-arm-seated-cable-row", "Einarmiges Kabelrudern", "cable"), g("chest-supported-db-row", "Brustgestütztes KH-Rudern", "dumbbell")] },
    { gym: g("straight-arm-pulldown", "Lat-Pullover am Kabel", "cable"), home: h("inverted-row", "Rudern unter dem Tisch", [8, 15]), sets: 2, reps: [12, 15], rir: [0, 1], rest: 90, primary: "back", secondary: [], alts: [g("db-pullover", "Pullover KH", "dumbbell")] },
    { gym: g("cable-reverse-fly", "Reverse Fly am Kabel", "cable"), home: h("dumbbell-reverse-fly", "Vorgebeugter Rucksack-Reverse-Fly", [15, 25]), homeDb: g("dumbbell-reverse-fly", "KH Reverse Fly", "dumbbell", { reps: [12, 20] }), sets: 3, reps: [12, 20], rir: [0, 1], rest: 90, primary: "reardelts", secondary: [], alts: [g("machine-reverse-fly", "Reverse Butterfly", "machine"), g("dumbbell-reverse-fly", "Reverse Fly KH", "dumbbell")] },
    { gym: g("cable-curl", "Bayesian Curl am Kabel", "cable"), home: h("bicep-curl", "Rucksack-Curl", [12, 20]), homeDb: g("bicep-curl", "KH-Curl", "dumbbell", { reps: [10, 15] }), sets: 3, reps: [10, 15], rir: [0, 1], rest: 90, primary: "biceps", secondary: [], alts: [g("ez-bar-curl", "SZ-Curl", "barbell"), g("bicep-curl", "KH-Curl", "dumbbell")] },
    { gym: g("ez-bar-reverse-curl", "Reverse Curl SZ", "barbell"), home: h("db-reverse-curl", "Rucksack-Reverse-Curl", [12, 20]), homeDb: g("db-reverse-curl", "KH-Reverse-Curl", "dumbbell", { reps: [12, 15] }), sets: 2, reps: [12, 15], rir: [0, 1], rest: 90, primary: "forearms", secondary: ["biceps"], alts: [g("db-reverse-curl", "Reverse Curl KH", "dumbbell")] },
    { gym: g("machine-back-extension", "Rückenstrecker", "machine"), home: h("bodyweight-good-morning", "Good Morning mit Rucksack", [12, 20]), sets: 2, reps: [10, 15], rir: [1, 2], rest: 90, primary: "lowerback", secondary: ["glutes", "hamstrings"], alts: [g("back-extension", "Hyperextension", "bodyweight")] },
  ],
}

const legsB: StrengthUnit = {
  id: "legsB",
  type: "strength",
  name: "Beine B",
  focus: "Gesäß, Quadrizeps, Adduktoren · moderat",
  minutes: 65,
  exercises: [
    { gym: g("leg-press", "Beinpresse", "machine"), home: h("step-ups", "Step-ups mit Rucksack", [12, 20]), homeDb: g("step-ups", "Step-ups mit KH", "dumbbell", { reps: [10, 15] }), sets: 3, reps: [10, 15], rir: [1, 1], rest: 120, primary: "quads", secondary: ["glutes"], alts: [g("hack-squat", "Hackenschmidt", "machine"), g("horizontal-leg-press", "Horizontale Beinpresse", "machine")] },
    { gym: g("hip-thrust", "Hip Thrust Langhantel", "barbell"), home: h("single-leg-hip-thrust", "Einbeiniger Hip Thrust", [12, 20]), sets: 3, reps: [8, 12], rir: [1, 1], rest: 120, primary: "glutes", secondary: ["hamstrings"], alts: [g("smith-machine-hip-thrust", "Hip Thrust Multipresse", "barbell"), g("plate-loaded-glute-drive", "Glute-Drive-Maschine", "machine")] },
    { gym: g("bulgarian-split-squat", "Bulgarian Split Squat KH", "dumbbell"), home: h("reverse-lunge", "Reverse Lunge mit Rucksack", [12, 20]), homeDb: g("db-lunge", "KH-Ausfallschritt", "dumbbell", { reps: [10, 15] }), sets: 3, reps: [8, 12], rir: [1, 1], rest: 120, perSide: true, primary: "quads", secondary: ["glutes", "adductors"], alts: [g("barbell-bulgarian-split-squat", "Bulgarian Split Squat LH", "barbell"), g("walking-lunge", "Gehende Ausfallschritte KH", "dumbbell")] },
    { gym: g("leg-curl", "Liegender Beinbeuger", "machine"), home: h("nordic-hamstring-curl", "Nordic Curl, langsam ablassen", [4, 8], { noLoad: true }), sets: 3, reps: [10, 15], rir: [0, 1], rest: 90, primary: "hamstrings", secondary: [], alts: [g("seated-leg-curl", "Sitzender Beinbeuger", "machine"), g("nordic-hamstring-curl", "Nordic Curl", "bodyweight", { noLoad: true, reps: [4, 8] })] },
    { gym: g("hip-adduction", "Adduktoren-Maschine", "machine"), home: h("cossack-squat", "Cossack Squat", [8, 12], { noLoad: true }), sets: 2, reps: [12, 15], rir: [0, 1], rest: 90, primary: "adductors", secondary: [], alts: [g("cossack-squat", "Cossack Squat", "bodyweight", { noLoad: true, reps: [8, 12] })] },
    { gym: g("hip-abduction", "Abduktoren-Maschine", "machine"), home: h("side-lying-hip-abduction", "Seitliches Beinheben liegend", [15, 25], { noLoad: true }), sets: 2, reps: [12, 20], rir: [0, 1], rest: 60, primary: "glutes", secondary: [], alts: [g("cable-kickback", "Kabel-Kickback", "cable"), g("side-lying-hip-abduction", "Seitliches Beinheben liegend", "bodyweight", { noLoad: true, reps: [15, 25] })] },
    { gym: g("smith-machine-calf-raise", "Wadenheben Multipresse", "barbell"), home: h("single-leg-calf-raise", "Einbeiniges Wadenheben an der Stufe", [12, 20]), sets: 4, reps: [12, 20], rir: [0, 1], rest: 90, primary: "calves", secondary: [], alts: [g("donkey-calf-raise", "Esel-Wadenheben", "machine"), g("machine-calf-raise", "Wadenmaschine", "machine"), g("seated-calf-raise", "Wadenheben sitzend (nur Schollenmuskel)", "machine")] },
  ],
}

const zone2: CardioUnit = {
  id: "zone2",
  type: "cardio",
  name: "Cardio Zone 2",
  focus: "locker, Erholungstag",
  minutes: 45,
  gym: { exId: "stationary-bike", text: "Rad oder Rudergerät" },
  home: { exId: "incline-treadmill-walk", text: "Zügiges Gehen bergauf oder Rad" },
  description: "45 min so locker, dass du in ganzen Sätzen sprechen kannst. Fördert die Erholung und die Ausdauer.",
  phases: [{ label: "Zone 2", minutes: 45 }],
}

const intervals: CardioUnit = {
  id: "intervals",
  type: "cardio",
  name: "Cardio Intervalle",
  focus: "4 × 4 min, Erholungstag",
  minutes: 40,
  gym: { exId: "rowing-machine", text: "Rad oder Rudergerät" },
  home: { exId: "running", text: "Laufen draußen oder Rad" },
  description: "10 min einrollen, dann 4 × 4 min hart (Sprechen kaum möglich) mit je 3 min locker, 5 min auslaufen.",
  phases: [
    { label: "Einrollen", minutes: 10 },
    { label: "Hart 1/4", minutes: 4, hard: true },
    { label: "Locker", minutes: 3 },
    { label: "Hart 2/4", minutes: 4, hard: true },
    { label: "Locker", minutes: 3 },
    { label: "Hart 3/4", minutes: 4, hard: true },
    { label: "Locker", minutes: 3 },
    { label: "Hart 4/4", minutes: 4, hard: true },
    { label: "Auslaufen", minutes: 5 },
  ],
}

const cooldown: CardioUnit = {
  id: "cooldown",
  type: "cardio",
  name: "Ausklang",
  focus: "15 min Zone 2 nach dem Krafttraining",
  minutes: 15,
  gym: { exId: "stationary-bike", text: "Rad, locker" },
  home: { exId: "walking", text: "Zügig gehen" },
  description: "15 min locker. Sammelt Ausdauer-Minuten fürs Wochenziel, ohne die Erholung zu stören.",
  phases: [{ label: "Zone 2", minutes: 15 }],
}

export const UNITS: Record<UnitId, Unit> = { pushA, pullA, legsA, pushB, pullB, legsB, zone2, intervals, cooldown }

/** Rotation: nach jedem Block aus Push, Pull, Beine folgt ein Erholungstag (Cardio oder frei). */
export const ROTATION: StrengthId[] = ["pushA", "pullA", "legsA", "pushB", "pullB", "legsB"]

/** Cardio am Erholungstag nach dem jeweiligen Beine-Tag */
export const RECOVERY_CARDIO: Partial<Record<StrengthId, CardioId>> = { legsA: "zone2", legsB: "intervals" }

export const STRENGTH_UNITS = ROTATION.map((id) => UNITS[id] as StrengthUnit)

export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  chest: "Brust",
  back: "Rücken (Lat)",
  shoulders: "Schultern",
  reardelts: "Hintere Schulter",
  traps: "Nacken",
  triceps: "Trizeps",
  biceps: "Bizeps",
  forearms: "Unterarme",
  quads: "Quadrizeps",
  hamstrings: "Beinbeuger",
  glutes: "Gesäß",
  adductors: "Adduktoren",
  calves: "Waden",
  abs: "Bauch",
  lowerback: "Unterer Rücken",
}

/** Alle Übungs-IDs, die der Plan braucht (für das Build-Skript) */
export function allExerciseIds(): string[] {
  const ids = new Set<string>()
  for (const u of Object.values(UNITS)) {
    if (u.type === "strength") {
      for (const e of u.exercises) {
        ids.add(e.gym.exId)
        ids.add(e.home.exId)
        if (e.homeDb) ids.add(e.homeDb.exId)
        for (const a of e.alts ?? []) ids.add(a.exId)
      }
    } else {
      ids.add(u.gym.exId)
      ids.add(u.home.exId)
    }
  }
  return [...ids]
}
