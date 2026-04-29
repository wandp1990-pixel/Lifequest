"use client"

import { useState, useEffect } from "react"
import { AlignLeft, Sun, Moon, RotateCcw } from "lucide-react"

interface TopHeaderProps {
  title: string
  onMenuClick?: () => void
  onRefresh?: () => void
}

export default function TopHeader({ title, onMenuClick, onRefresh }: TopHeaderProps) {
  const [isDark, setIsDark] = useState(false)
  const [spinning, setSpinning] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"))
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("theme", next ? "dark" : "light")
  }

  function handleRefresh() {
    if (!onRefresh) return
    setSpinning(true)
    onRefresh()
    setTimeout(() => setSpinning(false), 600)
  }

  return (
    <header className="flex items-center justify-between px-4 pt-4 pb-2">
      <button
        aria-label="Menu"
        onClick={onMenuClick}
        className="bg-muted rounded-2xl p-2.5 active:scale-95"
      >
        <AlignLeft className="w-5 h-5 text-muted-foreground" />
      </button>

      <h1 className="text-lg font-bold text-foreground">{title}</h1>

      <div className="flex items-center gap-2">
        {onRefresh && (
          <button
            aria-label="Refresh"
            onClick={handleRefresh}
            className="bg-muted rounded-2xl p-2.5 active:scale-95"
          >
            <RotateCcw className={`w-5 h-5 text-muted-foreground transition-transform duration-500 ${spinning ? "rotate-180" : ""}`} />
          </button>
        )}
        <button
          aria-label="Toggle theme"
          onClick={toggleTheme}
          className="bg-muted rounded-2xl p-2.5 active:scale-95"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Moon className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </div>
    </header>
  )
}
