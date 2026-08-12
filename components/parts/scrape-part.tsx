import { FileTextIcon } from "lucide-react"

import { type ScrapePageToolPart } from "@/tools"
import { safeHttpUrl } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

export function ScrapePart({ part }: { part: ScrapePageToolPart }) {
  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Reading {part.input?.url ?? "page"}…
        </div>
      )
    case "output-available":
      if ("error" in part.output) {
        return (
          <div className="text-sm text-destructive">{part.output.error}</div>
        )
      }
      return (
        <div className="flex flex-col gap-1.5 px-1.5 text-sm">
          <a
            href={safeHttpUrl(part.output.url) ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 font-medium text-foreground hover:underline"
          >
            <FileTextIcon className="size-4 shrink-0" />
            {part.output.url}
          </a>
          <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted p-2 text-xs text-muted-foreground">
            {part.output.content}
            {part.output.truncated && "…"}
          </div>
        </div>
      )
    case "output-error":
      return (
        <div className="text-sm text-destructive">
          Page scrape failed: {part.errorText}
        </div>
      )
    default:
      return null
  }
}
