"use client"

import * as React from "react"

import { BROWSER_MODEL_ID } from "@/lib/browser-model"
import { type GatewayModel } from "@/lib/models"
import { isWebLLMModelId } from "@/lib/webllm-models"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function ModelSelect({
  models,
  value,
  onValueChange,
}: {
  models: GatewayModel[]
  value: string
  onValueChange: (value: string) => void
}) {
  const items = React.useMemo(
    () => models.map((model) => ({ label: model.name, value: model.id })),
    [models]
  )

  const builtInItems = items.filter((item) => item.value === BROWSER_MODEL_ID)
  const webllmItems = items.filter((item) => isWebLLMModelId(item.value))
  const hostedItems = items.filter(
    (item) => item.value !== BROWSER_MODEL_ID && !isWebLLMModelId(item.value)
  )

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string") onValueChange(next)
      }}
    >
      <SelectTrigger aria-label="Model" className="bg-background">
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        alignItemWithTrigger={false}
        className="w-auto min-w-(--anchor-width)"
      >
        {builtInItems.length > 0 && (
          <SelectGroup>
            <SelectLabel>Chrome built-in</SelectLabel>
            {builtInItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {webllmItems.length > 0 && (
          <SelectGroup>
            <SelectLabel>On-device (WebLLM)</SelectLabel>
            {webllmItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        <SelectGroup>
          <SelectLabel>AnyRouter</SelectLabel>
          {hostedItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
