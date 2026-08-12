import { CloudIcon, DropletIcon, WindIcon } from "lucide-react"

import { type GetWeatherToolPart } from "@/tools"
import { Spinner } from "@/components/ui/spinner"

export function WeatherPart({ part }: { part: GetWeatherToolPart }) {
  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Checking the weather{part.input?.location ? ` in ${part.input.location}` : ""}…
        </div>
      )
    case "output-available":
      if ("error" in part.output) {
        return (
          <div className="text-sm text-destructive">{part.output.error}</div>
        )
      }
      return (
        <div className="flex w-fit items-center gap-3 px-1.5 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {part.output.location}
          </span>
          <span className="flex items-center gap-1">
            <CloudIcon className="size-3.5" />
            {part.output.temperatureC}°C, {part.output.condition}
          </span>
          <span className="flex items-center gap-1">
            <DropletIcon className="size-3.5" />
            {part.output.humidityPct}%
          </span>
          <span className="flex items-center gap-1">
            <WindIcon className="size-3.5" />
            {part.output.windKmh} km/h
          </span>
        </div>
      )
    case "output-error":
      return (
        <div className="text-sm text-destructive">
          Weather lookup failed: {part.errorText}
        </div>
      )
    default:
      return null
  }
}
