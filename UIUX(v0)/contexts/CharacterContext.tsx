/**
 * @module contexts/CharacterContext
 * @purpose 캐릭터 단일 진실. 자식이 useCharacterCtx() 로 char + refetch 직접 접근.
 *          Phase 5.1(2026-05-14) 부터 app/layout.tsx 에서 wrap, page.tsx 및 탭/드로어가 props 대신 컨텍스트 사용.
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
