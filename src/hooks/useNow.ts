import { useEffect, useState } from "react"

/** Aktuelle Zeit, aktualisiert im angegebenen Intervall */
export function useNow(intervalMs = 250, active = true) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    const onVisible = () => setNow(Date.now())
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [intervalMs, active])
  return now
}
