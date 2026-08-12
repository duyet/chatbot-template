import { ClockIcon } from "lucide-react"

import { type GetTimeToolPart } from "@/tools"
import { Spinner } from "@/components/ui/spinner"

export function GetTimePart({ part }: { part: GetTimeToolPart }) {
  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Checking the time{part.input?.timezone ? ` in ${part.input.timezone}` : ""}…
        </div>
      )
    case "output-available":
      if ("error" in part.output) {
        return (
          <div className="text-sm text-destructive">{part.output.error}</div>
        )
      }
      return (
        <div className="flex items-center gap-2 px-1.5 text-sm text-muted-foreground">
          <ClockIcon className="size-4" />
          <span className="font-medium text-foreground">
            {part.output.formatted}
          </span>
          <span>({part.output.timezone})</span>
        </div>
      )
    case "output-error":
      return (
        <div className="text-sm text-destructive">
          Time lookup failed: {part.errorText}
        </div>
      )
    default:
      return null
  }
}
