// Schneidet RepDB (data/repdb) auf die Übungen des Plans zu und kopiert die Bilder nach public/ex.
// Aufruf: node scripts/build-exercises.ts
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { allExerciseIds } from "../src/data/plan.ts"
import { hipExerciseIds } from "../src/data/hip.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const repdb = join(root, "..", "data", "repdb")
const fedb = join(root, "..", "data", "fedb")
const outImg = join(root, "public", "ex")
mkdirSync(outImg, { recursive: true })

interface RepDbExercise {
  id: string
  name_de: string
  primary_muscles?: string[]
  secondary_muscles?: string[]
  instructions_de?: string[]
  tips_de?: string[]
  images: { flat: Record<string, string> }
}

const all: RepDbExercise[] = JSON.parse(readFileSync(join(repdb, "exercises.json"), "utf8")).exercises
const byId = new Map(all.map((e) => [e.id, e]))

// Fehlt in RepDB: Bildpaar aus free-exercise-db (Public Domain), Texte selbst geschrieben.
const fallback: Record<string, { name: string; primary: string[]; secondary: string[]; tips: string[]; instructions: string[]; files: [string, string] }> = {
  "sissy-squat": {
    name: "Sissy Squat",
    primary: ["quadriceps"],
    secondary: ["hip_flexors"],
    tips: [
      "Halte dich mit einer Hand fest, damit du dich ganz auf die Oberschenkel konzentrieren kannst.",
      "Hüfte bleibt gestreckt: Knie, Hüfte und Schultern bilden eine Linie.",
      "Langsam nach hinten lehnen, die Knie wandern nach vorn, bis du die Dehnung im Quadrizeps spürst.",
    ],
    instructions: [
      "Stell dich hüftbreit hin und halte dich mit einer Hand an einer Stütze fest.",
      "Geh auf die Fußballen, schieb die Knie nach vorn und lehne den Oberkörper in einer Linie nach hinten.",
      "Senke dich so weit ab, wie du die Spannung halten kannst.",
      "Drück dich über die Oberschenkel zurück in den Stand.",
    ],
    files: ["sissy-0.jpg", "sissy-1.jpg"],
  },
}

const out: Record<string, unknown> = {}
const missing: string[] = []

for (const id of new Set([...allExerciseIds(), ...hipExerciseIds()])) {
  const e = byId.get(id)
  if (e) {
    const f = e.images.flat
    const frames = (f.start && f.peak ? [f.start, f.peak] : [f.main]).filter(Boolean)
    const imgs = frames.map((p, i) => {
      const name = `${id}-${i}.webp`
      copyFileSync(join(repdb, p), join(outImg, name))
      return `ex/${name}`
    })
    out[id] = {
      id,
      name: e.name_de,
      primary: e.primary_muscles ?? [],
      secondary: e.secondary_muscles ?? [],
      tips: (e.tips_de ?? []).slice(0, 3),
      instructions: e.instructions_de ?? [],
      images: imgs,
      source: "repdb",
    }
  } else if (fallback[id]) {
    const fb = fallback[id]
    const imgs = fb.files.map((file, i) => {
      const src = join(fedb, file)
      if (!existsSync(src)) throw new Error(`Bild fehlt: ${src}`)
      const name = `${id}-${i}.jpg`
      copyFileSync(src, join(outImg, name))
      return `ex/${name}`
    })
    out[id] = { id, name: fb.name, primary: fb.primary, secondary: fb.secondary, tips: fb.tips, instructions: fb.instructions, images: imgs, source: "free-exercise-db" }
  } else {
    missing.push(id)
  }
}

if (missing.length) {
  console.error("Fehlende Übungen:", missing.join(", "))
  process.exit(1)
}

writeFileSync(join(root, "src", "data", "exercises.json"), JSON.stringify(out, null, 1))
console.log(`${Object.keys(out).length} Übungen geschrieben`)
