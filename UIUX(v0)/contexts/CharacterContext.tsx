/**
 * @module contexts/CharacterContext
 * @purpose 캐릭터 단일 진실. 자식이 useCharacterCtx() 로 char + refetch 직접 접근 가능.
 *          현재(Phase 3) page.tsx 가 props 로 char 를 자식에 드릴링하는 구조이므로 본 컨텍스트는 Phase 4 분할 후 마이그레이션 예정.
 *          이 단계에서는 Provider 인프라만 마련. 기존 props 흐름은 그대로 유지.
 * @add-here:
 *   - gameConfig / battleConfig 같은 다른 단일 진실 데이터 (별도 hook → Provider value 에 합류)
 */

"use client"

import { createContext, useContext, useEffect, type ReactNode } from "react"
import { useCharacter, type CharacterData } from "@/hooks/useCharacter"

interface CharacterContextValue {
  char: CharacterData | null
  refetch: () => Promise<void>
}

const Ctx = createContext<CharacterContextValue | null>(null)

export function CharacterProvider({ children }: { children: ReactNode }) {
  const { char, refetch } = useCharacter()
  useEffect(() => { refetch() }, [refetch])
  return <Ctx.Provider value={{ char, refetch }}>{children}</Ctx.Provider>
}

export function useCharacterCtx(): CharacterContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error("useCharacterCtx must be used inside <CharacterProvider>")
  return v
}
