"use client"

import { useState, useEffect } from "react"
import { AlignLeft, Sun, Moon } from "lucide-react"

interface TopHeaderProps {
  title: string
  onMenuClick?: () => void
}

export default function TopHeader({ title, onMenuClick }: TopHeaderProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"))
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("theme", next ? "dark" : "light")
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
    </header>
  )
}
