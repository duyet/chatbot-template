import type { Metadata } from "next"

import { getModels } from "@/lib/models"
import { Chat } from "@/components/chat"

export const metadata: Metadata = {
  title: "Chat",
  description:
    "A chatbot template built using shadcn/ui, shadcn/react and shadcn/typeset, powered by AnyRouter.",
}

export default async function Page() {
  const models = await getModels()
  return <Chat models={models} />
}
