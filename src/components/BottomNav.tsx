import { CalendarDaysIcon, ChartNoAxesColumnIcon, DumbbellIcon, MoonIcon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { SPRING } from "@/components/bits"
import { tap } from "@/lib/native"
import { cn } from "@/lib/utils"

export type Tab = "today" | "sleep" | "progress" | "plan"

const TABS: { id: Tab; label: string; icon: typeof DumbbellIcon }[] = [
  { id: "today", label: "Heute", icon: DumbbellIcon },
  { id: "sleep", label: "Schlaf", icon: MoonIcon },
  { id: "progress", label: "Fortschritt", icon: ChartNoAxesColumnIcon },
  { id: "plan", label: "Plan", icon: CalendarDaysIcon },
]

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <motion.nav
      initial={{ y: 96 }}
      animate={{ y: 0 }}
      exit={{ y: 96 }}
      transition={SPRING}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-safe"
    >
      <motion.div layout transition={SPRING} className="pointer-events-auto flex gap-1 rounded-full bg-foreground p-1.5 shadow-lg shadow-black/15">
        {TABS.map(({ id, label, icon: Icon }) => {
          const on = tab === id
          return (
            <motion.button
              key={id}
              layout
              transition={SPRING}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                if (!on) tap()
                onChange(id)
              }}
              className={cn("relative flex h-12 items-center rounded-full px-4 text-sm font-semibold transition-colors duration-200", on ? "text-primary-foreground" : "text-background/60")}
              aria-current={on ? "page" : undefined}
              aria-label={label}
            >
              {on && <motion.span layoutId="nav-pill" transition={SPRING} className="absolute inset-0 rounded-full bg-primary" />}
              <motion.span layout="position" className="relative">
                <Icon className="size-5" />
              </motion.span>
              <AnimatePresence initial={false}>
                {on && (
                  <motion.span
                    key="label"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={SPRING}
                    className="relative overflow-hidden whitespace-nowrap"
                  >
                    <span className="pl-2">{label}</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </motion.div>
    </motion.nav>
  )
}
