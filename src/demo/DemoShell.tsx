import { useEffect, useRef, useState } from "react"
import { DatabaseIcon, DownloadIcon, ExternalLinkIcon, RotateCcwIcon, SmartphoneIcon, Trash2Icon, XIcon } from "lucide-react"
import App from "@/App"
import { clearDemoData, ensureInitialDemoSeed, seedDemoData } from "./seed"

const REPO_URL = "https://github.com/NicoDev01/workout-app"
const RELEASE_URL = "https://github.com/NicoDev01/workout-app/releases/latest"

type DemoAction = "demo:seed" | "demo:clear"

function useIsDesktop() {
  const [desktop, setDesktop] = useState(() => window.matchMedia("(min-width: 820px)").matches)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 820px)")
    const onChange = (e: MediaQueryListEvent) => setDesktop(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return desktop
}

/** Läuft innerhalb des Smartphone-iFrames (?embed=1) oder direkt auf echten Handys */
function EmbeddedDemo({ showMobileBar }: { showMobileBar: boolean }) {
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    document.documentElement.classList.add("demo-embed")
    void ensureInitialDemoSeed().then(() => setReady(true))
    const onMsg = async (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return
      const action = ev.data?.type as DemoAction | undefined
      if (action === "demo:seed") {
        await seedDemoData()
        window.location.reload()
      } else if (action === "demo:clear") {
        await clearDemoData()
        window.location.reload()
      }
    }
    window.addEventListener("message", onMsg)
    return () => {
      window.removeEventListener("message", onMsg)
      document.documentElement.classList.remove("demo-embed")
    }
  }, [])

  if (!ready) return <div className="min-h-dvh bg-background" />

  return (
    <>
      {showMobileBar && !dismissed && (
        <div className="sticky top-0 z-50 flex items-center justify-between gap-2 border-b border-border/80 bg-foreground px-3 py-2 text-xs text-background">
          <span className="font-semibold">Live-Demo</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={async () => {
                await seedDemoData()
                window.location.reload()
              }}
              className="rounded-full bg-primary px-2.5 py-1 font-semibold text-primary-foreground"
            >
              Demo-Daten
            </button>
            <button
              onClick={async () => {
                await clearDemoData()
                window.location.reload()
              }}
              className="rounded-full bg-background/15 px-2.5 py-1 font-medium text-background"
            >
              Leeren
            </button>
            <button onClick={() => setDismissed(true)} aria-label="Demo-Leiste schließen" className="p-1 opacity-70 hover:opacity-100">
              <XIcon className="size-3.5" />
            </button>
          </div>
        </div>
      )}
      <App />
    </>
  )
}

/** Desktop-Portfolio-Bühne mit realistischem Smartphone-Mockup und Demo-Steuerung */
function DesktopPhoneStage() {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [status, setStatus] = useState<string>("Beispieldaten aktiv (11 Wochen Trainingshistorie)")
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }))

  useEffect(() => {
    const id = window.setInterval(() => {
      setClock(new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }))
    }, 30_000)
    return () => window.clearInterval(id)
  }, [])

  const send = (type: DemoAction, nextStatus: string) => {
    frameRef.current?.contentWindow?.postMessage({ type }, window.location.origin)
    setStatus(nextStatus)
  }

  return (
    <div
      className="flex min-h-dvh w-full items-center justify-center px-6 py-6"
      style={{
        background:
          "radial-gradient(900px 540px at 12% 0%, rgba(242,107,29,0.14), transparent 65%), radial-gradient(760px 540px at 88% 100%, rgba(242,107,29,0.11), transparent 65%), linear-gradient(180deg, #fbfaf8 0%, #f3efe9 100%)",
      }}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center gap-12 lg:gap-16">
        {/* Linke Portfolio-Info & Demo-Steuerung */}
        <aside className="flex max-w-md flex-col gap-6">
          <div className="flex items-center gap-4">
            <img
              src="./icon.svg"
              alt="Workout App Icon"
              width={56}
              height={56}
              className="size-14 rounded-2xl shadow-lg shadow-[#f26b1d]/25"
            />
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f26b1d]/12 px-2.5 py-0.5 text-xs font-semibold text-[#c9520e]">
                <SmartphoneIcon className="size-3.5" />
                Interaktive Live-Demo
              </div>
              <h1
                className="mt-1 leading-none font-bold tracking-tight text-foreground"
                style={{ fontSize: "clamp(1.85rem, 1.3rem + 1.4vw, 2.5rem)" }}
              >
                Workout
              </h1>
            </div>
          </div>

          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Evidenzbasierte Offline-First Trainings- &amp; Regenerations-App für Android und Web – mit automatischer Progression,
            Volumensteuerung, Deload-Erkennung, Schlafroutine und KI-Analyse-Export.
          </p>

          <div className="flex flex-wrap gap-2 text-xs font-semibold text-foreground/80">
            {["React 19", "TypeScript", "Tailwind 4", "Dexie (IndexedDB)", "Capacitor 8", "45 Vitest-Tests"].map((tag) => (
              <span key={tag} className="rounded-full border border-black/8 bg-white/85 px-3 py-1 shadow-xs">
                {tag}
              </span>
            ))}
          </div>

          {/* Demo-Steuerung */}
          <div className="flex flex-col gap-3 rounded-3xl border border-black/8 bg-white/90 p-5 shadow-sm backdrop-blur-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <DatabaseIcon className="size-3.5 text-primary" />
                Demo-Daten (lokal im Browser)
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{status}</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => send("demo:seed", "Beispieldaten neu geladen (11 Wochen Historie)")}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-xs transition active:scale-97"
              >
                <RotateCcwIcon className="size-3.5" />
                Demo-Daten laden
              </button>
              <button
                onClick={() => send("demo:clear", "Datenbank geleert – App startet wie frisch installiert")}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-secondary px-4 py-2.5 text-xs font-semibold text-foreground transition hover:bg-muted active:scale-97"
              >
                <Trash2Icon className="size-3.5" />
                Leer starten
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Tipp: Öffne im Handy rechts <strong>Fortschritt</strong> für Heatmap &amp; Kraftkurven, starte <strong>Push A</strong> oder
              wechsle zwischen <strong>Gym</strong> und <strong>Home</strong>.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2.5 text-background shadow-sm transition hover:opacity-90"
            >
              GitHub Repository
              <ExternalLinkIcon className="size-3.5" />
            </a>
            <a
              href={RELEASE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/90 px-4 py-2.5 text-foreground shadow-xs transition hover:bg-white"
            >
              <DownloadIcon className="size-3.5" />
              Android APK
            </a>
          </div>
        </aside>

        {/* Rechtes Smartphone-Mockup */}
        <div className="relative shrink-0">
          {/* Dekorative Seitentasten */}
          <div aria-hidden="true" className="absolute top-28 -left-[3px] h-10 w-[3px] rounded-l bg-neutral-700" />
          <div aria-hidden="true" className="absolute top-42 -left-[3px] h-14 w-[3px] rounded-l bg-neutral-700" />
          <div aria-hidden="true" className="absolute top-36 -right-[3px] h-16 w-[3px] rounded-r bg-neutral-700" />

          <div
            className="relative flex flex-col overflow-hidden rounded-[50px] border-[3px] border-neutral-800 bg-neutral-950 p-[11px] shadow-[0_32px_70px_rgba(23,23,23,0.24),0_8px_22px_rgba(23,23,23,0.1)]"
            style={{ width: 412, height: "min(866px, calc(100dvh - 3rem))" }}
          >
            {/* Inneres Display */}
            <div className="relative flex size-full flex-col overflow-hidden rounded-[39px] bg-white">
              {/* Dezente Statusbar + Kamera-Pill */}
              <div
                aria-hidden="true"
                className="flex h-9 shrink-0 items-center justify-between bg-white px-7 pt-1 text-[12px] font-semibold text-foreground select-none"
              >
                <span className="num">{clock}</span>
                <div className="h-[22px] w-[86px] rounded-full bg-neutral-950" />
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-3.5 rounded-[3px] border border-foreground/70 p-[1px]">
                    <span className="block size-full rounded-[1px] bg-foreground" />
                  </span>
                </div>
              </div>

              {/* Echte App im isolierten iFrame */}
              <iframe
                ref={frameRef}
                src="./?embed=1"
                title="Workout App Interaktive Live-Demo"
                className="w-full flex-1 border-0 bg-white"
              />

              {/* Home-Indicator */}
              <div aria-hidden="true" className="flex h-5 shrink-0 items-center justify-center bg-white">
                <div className="h-1 w-28 rounded-full bg-neutral-900/20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DemoShell() {
  const isEmbed = new URLSearchParams(window.location.search).get("embed") === "1"
  const isDesktop = useIsDesktop()
  if (isEmbed) return <EmbeddedDemo showMobileBar={false} />
  if (!isDesktop) return <EmbeddedDemo showMobileBar={true} />
  return <DesktopPhoneStage />
}
