// Einstellung und Infos zum Hüftprogramm (Plan-Tab)
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card } from "@/components/ui/card"
import { Toggle } from "@/components/ui/toggle"
import { Pills } from "@/components/bits"
import { HIP_INFO, HIP_SOURCES, HIP_TYPE_HELP, HIP_TYPE_LABEL, type HipType } from "@/data/hip"
import { todayISO } from "@/lib/dates"
import { updateSettings, type Settings } from "@/lib/db"
import { ActivityIcon } from "lucide-react"

export function HipSettings({ hip }: { hip: Settings["hip"] }) {
  return (
    <Card className="gap-3 px-2 py-1">
      <div className="flex items-center gap-3 px-3 pt-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold">Schnappende Hüfte</div>
          <div className="text-xs text-muted-foreground">Tägliche Checkliste auf „Heute“ mit Dehnen und Kräftigen</div>
        </div>
        <Toggle
          pressed={!!hip}
          onPressedChange={(v) => void updateSettings({ hip: v ? { type: "unknown", since: todayISO() } : null })}
          aria-label="Schnappende Hüfte"
          className="size-12 rounded-full bg-muted text-muted-foreground hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground"
        >
          <ActivityIcon className="size-5" />
        </Toggle>
      </div>
      {hip && (
        <div className="flex flex-col gap-2 px-3">
          <div className="text-sm font-semibold">Wo schnappt es?</div>
          <Pills
            className="bg-background"
            value={hip.type}
            onChange={(type) => void updateSettings({ hip: { ...hip, type } })}
            options={(["external", "internal", "unknown"] as HipType[]).map((t) => ({ value: t, label: HIP_TYPE_LABEL[t] }))}
          />
          <p className="px-1 text-xs text-muted-foreground">{HIP_TYPE_HELP[hip.type]}</p>
        </div>
      )}
      <Accordion className="px-3">
        <AccordionItem value="what">
          <AccordionTrigger className="text-sm">Was steckt dahinter?</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
              <p>{HIP_INFO.what}</p>
              <p>{HIP_INFO.dose}</p>
              <p>
                Ablauf: Mobilität jeden Tag, Kraft an Pull- und Erholungstagen, an Beintagen eine kurze Aktivierung vor dem Training. Übungen im Plan, die Schnappen auslösen können, sind in der Einheit markiert.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="flags">
          <AccordionTrigger className="text-sm">Wann zum Arzt oder Physio?</AccordionTrigger>
          <AccordionContent>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
              {HIP_INFO.redFlags.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <div className="mt-3 flex flex-col gap-0.5 text-[10px] text-muted-foreground">
              {HIP_SOURCES.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                  {s.label}
                </a>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  )
}
