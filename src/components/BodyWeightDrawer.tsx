import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { ScaleIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Stepper, fmtKg } from "@/components/bits"
import { db } from "@/lib/db"
import { todayISO } from "@/lib/dates"

export function BodyWeightButton() {
  const [open, setOpen] = useState(false)
  const last = useLiveQuery(() => db.bodyweight.orderBy("date").last())
  const [kg, setKg] = useState(75)
  const openDrawer = () => {
    if (last) setKg(last.kg)
    setOpen(true)
  }

  const save = async () => {
    await db.bodyweight.put({ date: todayISO(), kg })
    setOpen(false)
    toast.success(`${fmtKg(kg)} kg gespeichert`)
  }

  return (
    <>
      <button onClick={openDrawer} className="flex h-10 items-center gap-1.5 rounded-full bg-card px-3 text-sm font-semibold">
        <ScaleIcon className="size-4 text-primary" />
        {last ? <span className="num">{fmtKg(last.kg)} kg</span> : <span>Gewicht</span>}
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Körpergewicht heute</DrawerTitle>
          </DrawerHeader>
          <div className="px-6 py-6">
            <Stepper value={kg} onChange={setKg} step={0.1} min={30} unit="kg" format={(v) => v.toFixed(1).replace(".", ",")} />
          </div>
          <DrawerFooter className="pb-safe">
            <Button size="lg" className="h-14 text-base" onClick={save}>
              Speichern
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  )
}
