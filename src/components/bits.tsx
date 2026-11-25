// Kleine wiederkehrende Bausteine: Bildschleife, Muskelkarte, Stepper, Kennzahl, Pillen-Umschalter.
import Model, { type Muscle } from "react-body-highlighter"
import { MinusIcon, PlusIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useId } from "react"
import { motion } from "motion/react"
import { imageUrl, type ExerciseInfo } from "@/lib/workout"

export function PoseLoop({ info, className, still = false }: { info: ExerciseInfo; className?: string; still?: boolean }) {
  const [a, b] = info.images
  return (
    <div className={cn("relative aspect-square overflow-hidden bg-[#dcebf7]", className)}>
      {b && <img src={imageUrl(b)} alt="" className="absolute inset-0 size-full object-cover" draggable={false} />}
      <img
        src={imageUrl(a)}
        alt={info.name}
        className={cn("absolute inset-0 size-full object-cover", b && !still && "pose-loop")}
        draggable={false}
      />
    </div>
  )
}

const MAP: Record<string, Muscle[]> = {
  pectoralis_major: ["chest"],
  latissimus_dorsi: ["upper-back"],
  rhomboids: ["upper-back"],
  infraspinatus_teres_minor: ["upper-back"],
  trapezius: ["trapezius"],
  erector_spinae: ["lower-back"],
  quadratus_lumborum: ["lower-back"],
  anterior_deltoid: ["front-deltoids"],
  lateral_deltoid: ["front-deltoids", "back-deltoids"],
  posterior_deltoid: ["back-deltoids"],
  biceps_brachii: ["biceps"],
  brachialis: ["biceps"],
  brachioradialis: ["forearm"],
  forearm_flexors: ["forearm"],
  forearm_extensors: ["forearm"],
  forearms: ["forearm"],
  triceps_brachii: ["triceps"],
  rectus_abdominis: ["abs"],
  transverse_abdominis: ["abs"],
  obliques: ["obliques"],
  quadriceps: ["quadriceps"],
  hamstrings: ["hamstring"],
  gluteus_maximus: ["gluteal"],
  gluteus_medius: ["gluteal"],
  adductors: ["adductor"],
  abductors: ["abductors"],
  gastrocnemius: ["calves"],
  soleus: ["calves"],
}

const toMuscles = (names: string[]) => [...new Set(names.flatMap((n) => MAP[n] ?? []))]

export function MuscleMap({ info, className }: { info: ExerciseInfo; className?: string }) {
  const primary = toMuscles(info.primary)
  const secondary = toMuscles(info.secondary).filter((m) => !primary.includes(m))
  const data = [
    { name: "sekundär", muscles: secondary },
    { name: "primär", muscles: primary },
    { name: "primär", muscles: primary },
  ]
  const colors = ["#f8b98c", "#f26b1d"]
  const style = { width: "100%" }
  return (
    <div className={cn("grid grid-cols-2 gap-1", className)}>
      <Model data={data} type="anterior" highlightedColors={colors} bodyColor="#d4d4d4" style={style} />
      <Model data={data} type="posterior" highlightedColors={colors} bodyColor="#d4d4d4" style={style} />
    </div>
  )
}

export function Stepper({
  value,
  onChange,
  step,
  min = 0,
  unit,
  big = false,
  format = (v: number) => String(v).replace(".", ","),
}: {
  value: number
  onChange: (v: number) => void
  step: number
  min?: number
  unit?: string
  big?: boolean
  format?: (v: number) => string
}) {
  const round = (v: number) => Math.round(v * 100) / 100
  return (
    <div className="flex items-center justify-between gap-3">
      <Button variant="secondary" size="icon-lg" className="size-14 rounded-full bg-muted" onClick={() => onChange(Math.max(min, round(value - step)))} aria-label="weniger">
        <MinusIcon className="size-6" />
      </Button>
      <div className="flex items-baseline gap-1">
        <span className={cn("num font-bold", big ? "text-6xl" : "text-5xl")}>{format(value)}</span>
        {unit && <span className="text-base text-muted-foreground">{unit}</span>}
      </div>
      <Button variant="secondary" size="icon-lg" className="size-14 rounded-full bg-muted" onClick={() => onChange(round(value + step))} aria-label="mehr">
        <PlusIcon className="size-6" />
      </Button>
    </div>
  )
}

export function Stat({ value, unit, label, className }: { value: string | number; unit?: string; label?: string; className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-baseline gap-1">
        <span className="num text-3xl font-bold">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {label && <div className="text-xs text-muted-foreground">{label}</div>}
    </div>
  )
}

/** Gemeinsame Feder für alle Übergänge: schnell, leicht nachschwingend */
export const SPRING = { type: "spring", bounce: 0.18, duration: 0.45 } as const

export function Pills<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: React.ReactNode }[]
  className?: string
}) {
  const id = useId()
  return (
    <div role="radiogroup" className={cn("flex gap-1 rounded-full bg-card p-1", className)}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <motion.button
            key={o.value}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            whileTap={{ scale: 0.96 }}
            className={cn(
              "relative flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-semibold transition-colors duration-200",
              on ? "text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {on && <motion.span layoutId={`pill-${id}`} transition={SPRING} className="absolute inset-0 rounded-full bg-primary" />}
            <span className="relative flex items-center gap-1.5">{o.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

export function fmtKg(kg: number) {
  return String(Math.round(kg * 100) / 100).replace(".", ",")
}
