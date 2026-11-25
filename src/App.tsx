import { useEffect, useRef, useState } from "react"
import { App as CapApp } from "@capacitor/app"
import { AnimatePresence, motion } from "motion/react"
import { Toaster } from "@/components/ui/sonner"
import { BottomNav, type Tab } from "@/components/BottomNav"
import { Today } from "@/screens/Today"
import { Sleep } from "@/screens/Sleep"
import { Progress } from "@/screens/Progress"
import { Plan } from "@/screens/Plan"
import { Session } from "@/screens/Session"
import { isNative, scheduleSleepRoutine, unlockAudio } from "@/lib/native"
import { runRules } from "@/lib/workout"
import { todayISO } from "@/lib/dates"
import { getSettings } from "@/lib/db"
import { buildSleepRoutine } from "@/data/sleep"

export function App() {
  const [tab, setTab] = useState<Tab>("today")
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [startIdx, setStartIdx] = useState<number | undefined>(undefined)
  const open = (id: number, idx?: number) => {
    setStartIdx(idx)
    setSessionId(id)
  }
  const state = useRef({ tab, sessionId })
  useEffect(() => {
    state.current = { tab, sessionId }
  }, [tab, sessionId])

  useEffect(() => {
    void runRules(todayISO())
    void getSettings().then((s) => scheduleSleepRoutine(buildSleepRoutine(s.sleepConfig), s.sleepConfig.notifications))
    const unlock = () => unlockAudio()
    window.addEventListener("pointerdown", unlock, { once: true })
    return () => window.removeEventListener("pointerdown", unlock)
  }, [])

  // Android-Zurück-Taste: Session schließen bzw. zum Heute-Tab, sonst App minimieren.
  useEffect(() => {
    if (!isNative) return
    const handle = CapApp.addListener("backButton", () => {
      const { tab, sessionId } = state.current
      if (sessionId !== null) setSessionId(null)
      else if (tab !== "today") setTab("today")
      else void CapApp.minimizeApp()
    })
    return () => void handle.then((h) => h.remove())
  }, [])

  return (
    <div className="mx-auto min-h-full max-w-md">
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {tab === "today" && <Today onStart={open} />}
          {tab === "sleep" && <Sleep />}
          {tab === "progress" && <Progress />}
          {tab === "plan" && <Plan />}
        </motion.main>
      </AnimatePresence>
      <AnimatePresence>{sessionId === null && <BottomNav key="nav" tab={tab} onChange={setTab} />}</AnimatePresence>
      <AnimatePresence>
        {sessionId !== null && (
          <motion.div
            key={sessionId}
            className="fixed inset-0 z-50"
            initial={{ y: "100%" }}
            animate={{ y: 0, transitionEnd: { transform: "none" } }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.42 }}
          >
            <Session sessionId={sessionId} startIdx={startIdx} onClose={() => setSessionId(null)} onSwitch={(id) => open(id)} />
          </motion.div>
        )}
      </AnimatePresence>
      <Toaster theme="light" position="top-center" />
    </div>
  )
}

export default App
