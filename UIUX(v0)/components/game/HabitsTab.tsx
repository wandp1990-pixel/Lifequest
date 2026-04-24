"use client"

import { useState } from "react"
import { Plus, Minus } from "lucide-react"

interface Habit {
  id: string
  title: string
  hasPlus: boolean
  hasMinus: boolean
}

const initialHabits: Habit[] = [
  {
    id: "1",
    title: "Tap here to edit this into a bad habit you'd like to quit",
    hasPlus: false,
    hasMinus: true,
  },
  {
    id: "2",
    title: "Practiced a new creative technique",
    hasPlus: true,
    hasMinus: false,
  },
  {
    id: "3",
    title: "10 minutes cardio",
    hasPlus: true,
    hasMinus: false,
  },
  {
    id: "4",
    title: "Eat health/junk food",
    hasPlus: true,
    hasMinus: true,
  },
  {
    id: "5",
    title: "Process email",
    hasPlus: true,
    hasMinus: false,
  },
]

export default function HabitsTab() {
  const [habits] = useState<Habit[]>(initialHabits)
  const [flashed, setFlashed] = useState<{ id: string; type: "plus" | "minus" } | null>(null)

  const handleClick = (id: string, type: "plus" | "minus") => {
    setFlashed({ id, type })
    setTimeout(() => setFlashed(null), 300)
  }

  return (
    <div className="flex flex-col gap-0">
      {habits.map((habit) => (
        <div
          key={habit.id}
          className="flex items-stretch bg-white border-b border-gray-100"
        >
          {/* Left Button */}
          {habit.hasPlus ? (
            <button
              onClick={() => handleClick(habit.id, "plus")}
              className={`w-14 flex items-center justify-center flex-shrink-0 transition-all ${
                flashed?.id === habit.id && flashed.type === "plus"
                  ? "bg-[#d4a017]"
                  : "bg-[#f0a500]"
              } rounded-l-xl my-1 ml-1`}
              aria-label="Positive habit"
            >
              <Plus className="w-6 h-6 text-white stroke-[3]" />
            </button>
          ) : (
            <div className="w-14 flex items-center justify-center flex-shrink-0">
              <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center">
                <Plus className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 py-3 px-3">
            <p className="text-sm font-semibold text-gray-800 leading-snug">{habit.title}</p>
          </div>

          {/* Right Button */}
          {habit.hasMinus ? (
            <button
              onClick={() => handleClick(habit.id, "minus")}
              className={`w-14 flex items-center justify-center flex-shrink-0 transition-all ${
                flashed?.id === habit.id && flashed.type === "minus"
                  ? "bg-[#d4a017]"
                  : "bg-[#f0a500]"
              } rounded-r-xl my-1 mr-1`}
              aria-label="Negative habit"
            >
              <Minus className="w-6 h-6 text-white stroke-[3]" />
            </button>
          ) : (
            <div className="w-14 flex items-center justify-center flex-shrink-0">
              <div className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center">
                <Minus className="w-4 h-4 text-gray-300" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
