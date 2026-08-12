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

  const isOnDevice = (value: string) =>
    value === BROWSER_MODEL_ID || isWebLLMModelId(value)

  const hostedItems = items.filter((item) => !isOnDevice(item.value))
  const onDeviceItems = items.filter((item) => isOnDevice(item.value))

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
        {onDeviceItems.length > 0 && (
          <SelectGroup>
            <SelectLabel>On-device</SelectLabel>
            {onDeviceItems.map((item) => (
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
