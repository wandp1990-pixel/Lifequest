import { NextRequest, NextResponse } from "next/server"
import { initDb, savePushSubscription, deletePushSubscription } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    await initDb()
    const { endpoint, keys } = await req.json()
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "필수값 누락" }, { status: 400 })
    }
    await savePushSubscription(endpoint, keys.p256dh, keys.auth)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDb()
    const { endpoint } = await req.json()
    if (!endpoint) return NextResponse.json({ error: "endpoint 필요" }, { status: 400 })
    await deletePushSubscription(endpoint)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
