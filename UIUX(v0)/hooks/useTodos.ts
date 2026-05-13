/**
 * @module hooks/useTodos
 * @purpose /api/todos 데이터(todoItems) + 완료 카운터 상태 + refetch.
 *          API 응답이 { items: TodoItem[] } 또는 TodoItem[] (legacy) 양쪽을 허용하므로 양쪽 형식 모두 수용.
 */

import { useCallback, useState } from "react"
import type { TodoItem } from "@/components/game/TodoSection"
import { apiGet, ApiError } from "./useApi"

export function useTodos() {
  const [todoItems, setTodoItems] = useState<TodoItem[]>([])
  const [completedTodoCount, setCompletedTodoCount] = useState(0)

  const refetch = useCallback(async () => {
    try {
      const data = await apiGet<{ items?: TodoItem[] } | TodoItem[]>("/api/todos")
      const items = Array.isArray(data) ? data : (data.items ?? [])
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
