// Brücke zu Android (Capacitor) mit Web-Fallbacks.
import { Haptics, ImpactStyle } from "@capacitor/haptics"
import { Capacitor } from "@capacitor/core"
import { LocalNotifications } from "@capacitor/local-notifications"
import { KeepAwake } from "@capawesome/capacitor-keep-awake"
import type { SleepStep } from "@/data/sleep"

export const isNative = Capacitor.isNativePlatform()

/** Kurzes haptisches Feedback (Tab-Wechsel, Satz geloggt) */
export function tap(strong = false) {
  if (isNative) void Haptics.impact({ style: strong ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => {})
}

const CHANNEL = "timer"
const SLEEP_CHANNEL = "sleep"
const REST_ID = 1
const CARDIO_BASE = 100
const SLEEP_IDS = [301, 302, 303, 304, 305, 306, 307]

let channelReady: Promise<void> | null = null
function ensureChannel() {
  if (!isNative) return Promise.resolve()
  channelReady ??= Promise.all([
    LocalNotifications.createChannel({
      id: CHANNEL,
      name: "Timer",
      description: "Pausen- und Intervall-Timer",
      importance: 5,
      vibration: true,
      visibility: 1,
    }),
    LocalNotifications.createChannel({
      id: SLEEP_CHANNEL,
      name: "Schlafroutine",
      description: "Tägliche Erinnerungen für die Schlafroutine",
      importance: 4,
      vibration: true,
      visibility: 1,
    }),
  ])
    .then(() => undefined)
    .catch(() => undefined)
  return channelReady
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isNative) {
    const p = await LocalNotifications.requestPermissions()
    return p.display === "granted"
  }
  return true
}

async function schedule(items: { id: number; at: number; title: string; body: string }[]) {
  if (!isNative) return
  await ensureChannel()
  const future = items.filter((n) => n.at > Date.now() + 500)
  if (!future.length) return
  await LocalNotifications.schedule({
    notifications: future.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      channelId: CHANNEL,
      schedule: { at: new Date(n.at), allowWhileIdle: true },
      foreground: true,
      autoCancel: true,
    })),
  }).catch(() => undefined)
}

export function scheduleRestEnd(at: number, body: string) {
  return schedule([{ id: REST_ID, at, title: "Pause vorbei", body }])
}

export async function cancelRestEnd() {
  if (isNative) await LocalNotifications.cancel({ notifications: [{ id: REST_ID }] }).catch(() => undefined)
}

export function scheduleCardio(phases: { endAt: number; next: string }[]) {
  return schedule(phases.map((p, i) => ({ id: CARDIO_BASE + i, at: p.endAt, title: "Phase vorbei", body: p.next })))
}

export async function cancelCardio(count: number) {
  if (!isNative) return
  const notifications = Array.from({ length: count }, (_, i) => ({ id: CARDIO_BASE + i }))
  await LocalNotifications.cancel({ notifications }).catch(() => undefined)
}

export async function cancelSleepRoutine() {
  if (!isNative) return
  await LocalNotifications.cancel({ notifications: SLEEP_IDS.map((id) => ({ id })) }).catch(() => undefined)
}

export async function scheduleSleepRoutine(steps: SleepStep[], enabled: boolean) {
  if (!isNative) return
  await ensureChannel()
  await cancelSleepRoutine()
  if (!enabled) return
  const items = steps.filter((s) => !!s.notify)
  if (!items.length) return
  await LocalNotifications.schedule({
    notifications: items.map((s) => {
      const [hour, minute] = s.time.split(":").map(Number)
      return {
        id: s.notify!.id,
        title: s.notify!.title,
        body: s.notify!.body,
        channelId: SLEEP_CHANNEL,
        schedule: { on: { hour, minute }, allowWhileIdle: true },
        autoCancel: true,
      }
    }),
  }).catch(() => undefined)
}

let wakeLock: WakeLockSentinel | null = null
export async function keepAwake(on: boolean) {
  try {
    if (isNative) {
      if (on) await KeepAwake.keepAwake()
      else await KeepAwake.allowSleep()
      return
    }
    if (on && "wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen")
    if (!on) {
      await wakeLock?.release()
      wakeLock = null
    }
  } catch {
    // Display-Sperre ist ein Komfort, kein Fehlerfall.
  }
}

let audio: AudioContext | null = null
/** Ton und Vibration im Vordergrund (zusätzlich zur System-Benachrichtigung) */
export function alarm() {
  try {
    navigator.vibrate?.([300, 150, 300, 150, 300])
    audio ??= new AudioContext()
    const ctx = audio
    ;[0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = 880
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.25)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + t)
      o.stop(ctx.currentTime + t + 0.3)
    })
  } catch {
    // ohne Audio weiter
  }
}

/** AudioContext beim ersten Tippen entsperren (Browser-Autoplay-Regeln) */
export function unlockAudio() {
  try {
    audio ??= new AudioContext()
    void audio.resume()
  } catch {
    // ignorieren
  }
}
