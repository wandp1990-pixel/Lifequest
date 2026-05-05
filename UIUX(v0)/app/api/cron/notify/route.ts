import { NextRequest, NextResponse } from "next/server"
import webpush from "web-push"
import {
  initDb,
  getAllPushSubscriptions,
  getPendingHabitNotifications,
  getPendingTodoNotifications,
} from "@/lib/db"

function kstTimeNow(): { time: string; date: string } {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const hh = kst.getUTCHours().toString().padStart(2, "0")
  const mm = kst.getUTCMinutes().toString().padStart(2, "0")
  return {
    time: `${hh}:${mm}`,
    date: kst.toISOString().slice(0, 10),
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 })
  }
  webpush.setVapidDetails(
    "mailto:wandp1990@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )

  try {
    await initDb()
    const { time, date } = kstTimeNow()

    const [subs, habits, todos] = await Promise.all([
      getAllPushSubscriptions(),
      getPendingHabitNotifications(time, date),
      getPendingTodoNotifications(time),
    ])

    if (subs.length === 0 || (habits.length === 0 && todos.length === 0)) {
      return NextResponse.json({ sent: 0 })
    }

    const notifications = [
      ...habits.map((h) => ({ title: "🔥 습관 알림", body: h.name, tag: `habit-${h.id}` })),
      ...todos.map((t) => ({ title: "📋 할 일 알림", body: t.name, tag: `todo-${t.id}` })),
    ]

    let sent = 0
    for (const sub of subs) {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }
      for (const notif of notifications) {
        try {
          await webpush.sendNotification(subscription, JSON.stringify(notif))
          sent++
        } catch {
          // 만료된 구독 등 무시
        }
      }
    }

    return NextResponse.json({ sent, time, habits: habits.length, todos: todos.length })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
