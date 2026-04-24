"use client"

import { AlignLeft, Search, Plus } from "lucide-react"

interface TopHeaderProps {
  title: string
}

export default function TopHeader({ title }: TopHeaderProps) {
  return (
    <header className="flex items-center justify-between px-3 pt-4 pb-2">
      <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-3 py-2">
        <button aria-label="Menu">
          <AlignLeft className="w-5 h-5 text-gray-600" />
        </button>
        <button aria-label="Search">
          <Search className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <h1 className="text-lg font-bold text-gray-800">{title}</h1>

      <button
        aria-label="Add new item"
        className="bg-gray-100 rounded-2xl p-2.5"
      >
        <Plus className="w-5 h-5 text-gray-600" />
      </button>
    </header>
  )
}
