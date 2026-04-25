"use client"

import Image from "next/image"

interface CharacterPanelProps {
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  level: number
}

export default function CharacterPanel({
  hp,
  maxHp,
  mp,
  maxMp,
  level,
}: CharacterPanelProps) {
  const hpPercent = (hp / maxHp) * 100
  const mpPercent = (mp / maxMp) * 100

  return (
    <div className="flex gap-3 px-4 pt-3 pb-2">
      {/* Avatar */}
      <div className="w-28 h-28 rounded-2xl bg-[#8b7fd4] flex items-center justify-center flex-shrink-0 overflow-hidden">
        <Image
          src="/pixel-character.png"
          alt="플레이어 캐릭터"
          width={112}
          height={112}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Stats */}
      <div className="flex-1 flex flex-col justify-center gap-1.5">
        {/* HP */}
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-base">❤️</span>
            <span className="text-xs font-bold text-[#e74c3c] uppercase tracking-wide">HP</span>
            <span className="ml-auto text-xs font-semibold text-[#e74c3c]">{hp} / {maxHp}</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#e74c3c] to-[#ff6b6b] transition-all"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* MP */}
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-base">💎</span>
            <span className="text-xs font-bold text-[#3498db] uppercase tracking-wide">MP</span>
            <span className="ml-auto text-xs font-semibold text-[#3498db]">{mp} / {maxMp}</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#3498db] to-[#5dade2] transition-all"
              style={{ width: `${mpPercent}%` }}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
