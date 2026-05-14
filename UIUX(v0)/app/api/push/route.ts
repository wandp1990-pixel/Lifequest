import { NextRequest } from "next/server"
import { savePushSubscription, deletePushSubscription } from "@/lib/db"
import { ok, badRequest, withInit } from "@/lib/api/respond"

export const POST = withInit(async (req: NextRequest) => {
  const { endpoint, keys } = await req.json()
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return badRequest("필수값 누락")
  }
  await savePushSubscription(endpoint, keys.p256dh, keys.auth)
  return ok({ ok: true })
})

export const DELETE = withInit(async (req: NextRequest) => {
  const { endpoint } = await req.json()
  if (!endpoint) return badRequest("endpoint 필요")
  await deletePushSubscription(endpoint)
  return ok({ ok: true })
})
