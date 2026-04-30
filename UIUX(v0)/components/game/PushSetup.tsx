"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff } from "lucide-react"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export default function PushSetup() {
  const [status, setStatus] = useState<"idle" | "subscribed" | "denied" | "unsupported">("idle")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported")
      return
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {})
    if (Notification.permission === "granted") {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) setStatus("subscribed")
        })
      })
    } else if (Notification.permission === "denied") {
      setStatus("denied")
    }
  }, [])

  const subscribe = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setStatus("denied")
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })
      await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      })
      setStatus("subscribed")
    } catch {
      setStatus("denied")
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setStatus("idle")
    } finally {
      setLoading(false)
    }
  }

  if (status === "unsupported") return null

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        {status === "subscribed" ? (
          <Bell className="w-4 h-4 text-amber-500" />
        ) : (
          <BellOff className="w-4 h-4 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-semibold">
            {status === "subscribed" ? "알림 켜짐" : "앱 푸시 알림"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {status === "subscribed"
              ? "습관·할일 알림이 활성화되었습니다"
              : status === "denied"
              ? "알림이 차단되었습니다 (기기 설정에서 허용)"
              : "습관·할일 알림을 받으려면 허용하세요"}
          </p>
        </div>
      </div>
      {status !== "denied" && (
        <button
          onClick={status === "subscribed" ? unsubscribe : subscribe}
          disabled={loading}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
            status === "subscribed"
              ? "bg-muted text-muted-foreground"
              : "bg-amber-100 text-amber-700"
          } ${loading ? "opacity-50 cursor-wait" : ""}`}
        >
          {loading ? "..." : status === "subscribed" ? "끄기" : "허용"}
        </button>
      )}
    </div>
  )
}
