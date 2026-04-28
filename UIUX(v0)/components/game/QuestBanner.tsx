"use client"

interface QuestBannerProps {
  title: string
  progress: number
  total: number
}

export default function QuestBanner({ title, progress, total }: QuestBannerProps) {
  const progressPercent = (progress / total) * 100

  return (
    <div className="mx-4 mb-2">
      <div
        className="rounded-xl px-3 py-2 relative overflow-hidden"
        style={{
          backgroundImage: "linear-gradient(var(--background), var(--background)), linear-gradient(135deg, #a8edea, #fed6e3, #d4b9ff)",
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box",
          border: "2px solid transparent",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-purple-500 text-xs leading-none">✦</span>
            <span className="font-bold text-foreground text-xs">{title}</span>
          </div>
          <span className="text-xs font-bold text-[#7c3aed] flex-shrink-0">{progress} / {total}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden mt-1.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#a855f7] transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
