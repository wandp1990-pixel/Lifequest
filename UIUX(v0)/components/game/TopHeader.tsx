"use client"

import { AlignLeft } from "lucide-react"

interface TopHeaderProps {
  title: string
  onMenuClick?: () => void
}

export default function TopHeader({ title, onMenuClick }: TopHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 pt-4 pb-2">
      <button
        aria-label="Menu"
        onClick={onMenuClick}
        className="bg-gray-100 rounded-2xl p-2.5 active:scale-95"
      >
        <AlignLeft className="w-5 h-5 text-gray-600" />
      </button>

      <h1 className="text-lg font-bold text-gray-800">{title}</h1>

      <div className="w-10" />
    </header>
  )
}
