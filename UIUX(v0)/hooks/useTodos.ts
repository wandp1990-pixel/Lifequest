/**
 * @module hooks/useTodos
 * @purpose /api/todos 데이터(todoItems) + 완료 카운터 상태 + refetch.
 *          모든 메서드(GET/POST/PUT/DELETE)가 { items: TodoItem[] } 로 통일됨.
 */

import { useCallback, useState } from "react"
import type { TodoItem } from "@/components/game/TodoSection"
import { apiGet, ApiError } from "./useApi"

export function useTodos() {
  const [todoItems, setTodoItems] = useState<TodoItem[]>([])
  const [completedTodoCount, setCompletedTodoCount] = useState(0)

  const refetch = useCallback(async () => {
    try {
      const data = await apiGet<{ items: TodoItem[] }>("/api/todos")
      const items = data.items ?? []
      setTodoItems(items)
      setCompletedTodoCount(items.filter((t) => t.is_completed).length)
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
    }
  }, [])

  return {
    todoItems, setTodoItems,
    completedTodoCount, setCompletedTodoCount,
    refetch,
  }
}
