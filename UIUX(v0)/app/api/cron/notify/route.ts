import { NextRequest, NextResponse } from "next/server"
import webpush from "web-push"
import {
  getAllPushSubscriptions,
  getPendingHabitNotifications,
  getPendingTodoNotifications,
  deletePushSubscription,
} from "@/lib/db"
import { ok, err, withInit } from "@/lib/api/respond"

function kstTimeNow(): { time: string; date: string } {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const hh = kst.getUTCHours().toString().padStart(2, "0")
  const mm = kst.getUTCMinutes().toString().padStart(2, "0")
  return {
    time: `${hh}:${mm}`,
    date: kst.toISOString().slice(0, 10),
  }
}

export const GET = withInit(async (req: NextRequest) => {
  const authHeader = req.headers.get("authorization")
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return err("VAPID keys not configured", 500)
  }
  webpush.setVapidDetails(
    "mailto:wandp1990@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )

  const { time, date } = kstTimeNow()

  const [subs, habits, todos] = await Promise.all([
    getAllPushSubscriptions(),
    getPendingHabitNotifications(time, date),
    getPendingTodoNotifications(time),
  ])

  if (subs.length === 0 || (habits.length === 0 && todos.length === 0)) {
    return ok({ sent: 0 })
  }

  const notifications = [
    ...habits.map((h) => ({ title: "🔥 습관 알림", body: h.name, tag: `habit-${h.id}` })),
    ...todos.map((t) => ({ title: "📋 할 일 알림", body: t.name, tag: `todo-${t.id}` })),
  ]

  let sent = 0
  let removed = 0
  for (const sub of subs) {
    const subscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    }
    let endpointDead = false
    for (const notif of notifications) {
      if (endpointDead) break
      try {
        await webpush.sendNotification(subscription, JSON.stringify(notif))
        sent++
      } catch (e: unknown) {
        // 410 Gone / 404 Not Found = 만료된 구독. 삭제하고 이 endpoint는 더 이상 시도하지 않음.
        const status = (e as { statusCode?: number })?.statusCode
        if (status === 410 || status === 404) {
          await deletePushSubscription(sub.endpoint)
          removed++
          endpointDead = true
        }
        // 그 외(네트워크 오류 등)는 다음 알림에서 재시도
      }
    }
  }

  return ok({ sent, removed, time, habits: habits.length, todos: todos.length })
})
