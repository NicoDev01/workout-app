import { Directory, Encoding, Filesystem } from "@capacitor/filesystem"
import { Share } from "@capacitor/share"
import { db } from "./db"
import { todayISO } from "./dates"
import { isNative } from "./native"

interface Backup {
  app: "workout"
  version: 1
  exportedAt: string
  sessions: unknown[]
  sets: unknown[]
  bodyweight: unknown[]
  cardio: unknown[]
  settings: unknown[]
  hip?: unknown[]
  sleep?: unknown[]
}

export async function exportBackup() {
  const data: Backup = {
    app: "workout",
    version: 1,
    exportedAt: new Date().toISOString(),
    sessions: await db.sessions.toArray(),
    sets: await db.sets.toArray(),
    bodyweight: await db.bodyweight.toArray(),
    cardio: await db.cardio.toArray(),
    settings: await db.settings.toArray(),
    hip: await db.hip.toArray(),
    sleep: await db.sleep.toArray(),
  }
  await shareFile(`workout-backup-${todayISO()}.json`, JSON.stringify(data), "application/json", "Workout-Backup")
}

/** Datei teilen (Android: Teilen-Menü, z. B. Drive, Mail, KI-App) bzw. im Browser herunterladen */
export async function shareFile(name: string, content: string, type: string, title: string) {
  if (isNative) {
    const { uri } = await Filesystem.writeFile({ path: name, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 })
    await Share.share({ title, files: [uri] })
    return
  }
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export async function importBackup(file: File) {
  const data = JSON.parse(await file.text()) as Backup
  if (data.app !== "workout" || data.version !== 1) throw new Error("Keine gültige Backup-Datei")
  await db.transaction("rw", [db.sessions, db.sets, db.bodyweight, db.cardio, db.settings, db.hip, db.sleep], async () => {
    await Promise.all([db.sessions.clear(), db.sets.clear(), db.bodyweight.clear(), db.cardio.clear(), db.settings.clear(), db.hip.clear(), db.sleep.clear()])
    await db.sessions.bulkAdd(data.sessions as never[])
    await db.sets.bulkAdd(data.sets as never[])
    await db.bodyweight.bulkAdd(data.bodyweight as never[])
    await db.cardio.bulkAdd(data.cardio as never[])
    await db.settings.bulkAdd(data.settings as never[])
    await db.hip.bulkAdd((data.hip ?? []) as never[])
    await db.sleep.bulkAdd((data.sleep ?? []) as never[])
  })
}
