"use client"

interface QuestBannerProps {
  title: string
  progress: number
  total: number
}

export default function QuestBanner({ title, progress, total }: QuestBannerProps) {
  const progressPercent = (progress / total) * 100

  return (
    <div className="mx-4 mb-3">
      <div
        className="rounded-2xl p-3 relative overflow-hidden"
        style={{
          background: "white",
          border: "2px solid transparent",
          backgroundClip: "padding-box",
          boxShadow: "0 0 0 2px transparent, inset 0 0 0 2px white",
          backgroundImage: "linear-gradient(white, white), linear-gradient(135deg, #a8edea, #fed6e3, #d4b9ff)",
          backgroundOrigin: "border-box",
        }}
      >
        {/* Decorative ghost shapes */}
        <div className="absolute right-8 top-1 opacity-20 text-2xl">👻</div>
        <div className="absolute right-16 bottom-1 opacity-15 text-xl">👻</div>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Star icons */}
            <div className="flex flex-col gap-0.5">
              <span className="text-purple-500 text-base">✦</span>
              <span className="text-red-400 text-xs">✦</span>
            </div>
            <span className="font-bold text-gray-800 text-sm">{title}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-1">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#a855f7] transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-[#7c3aed]">{progress} / {total}</span>
        </div>
      </div>
    </div>
  )
}
