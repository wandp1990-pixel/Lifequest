/**
 * @module components/game/ItemsTab
 * @purpose 아이템 탭 컨테이너. inventory fetch + 가챠 mutation + 장비 교체/삭제 조정.
 *          하위: GachaBanner / ReplaceModal / EquippedGrid / UnequippedGrid.
 *          drawTickets/refetch 는 CharacterContext 에서 직접 구독 (Phase 5.1).
 */

"use client"

import { useState, useEffect } from "react"
import GachaBanner from "./items/GachaBanner"
import ReplaceModal from "./items/ReplaceModal"
import EquippedGrid from "./items/EquippedGrid"
import UnequippedGrid from "./items/UnequippedGrid"
import type { EquipmentItem, GachaResult } from "./items/parts"
import { useCharacterCtx } from "@/contexts/CharacterContext"

interface Props {
  refreshTick?: number
}

export default function ItemsTab({ refreshTick }: Props) {
  const { char, refetch } = useCharacterCtx()
  const drawTickets = char?.draw_tickets ?? 0
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [rolling, setRolling] = useState(false)
  const [lastResult, setLastResult] = useState<{ item: GachaResult; autoEquipped: boolean } | null>(null)
  const [pendingReplace, setPendingReplace] = useState<{ newItem: GachaResult; oldItem: EquipmentItem } | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchInventory = async () => {
    const res = await fetch("/api/inventory")
    if (res.ok) {
      const data = await res.json()
      setEquipment(data.equipment ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchInventory() }, [refreshTick])

  const patchInventory = async (body: object) => {
    await fetch("/api/inventory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  const handleGacha = async () => {
    if (rolling || drawTickets < 1) return
    setRolling(true)
    setLastResult(null)
    setPendingReplace(null)
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 1 }),
      })
      if (!res.ok) return
      const data = await res.json()
      const item: GachaResult = data.results?.[0]
      if (!item) return

      refetch()
      const currentEquipped = equipment.find((e) => e.slot === item.slot && e.is_equipped === 1)

      if (!currentEquipped) {
        await patchInventory({ action: "equip", itemId: item.id })
        await fetchInventory()
        refetch()
        setLastResult({ item, autoEquipped: true })
      } else {
        await fetchInventory()
        setPendingReplace({ newItem: item, oldItem: currentEquipped })
      }
    } finally {
      setRolling(false)
    }
  }

  const handleReplace = async () => {
    if (!pendingReplace) return
    const { newItem, oldItem } = pendingReplace
    await patchInventory({ action: "equip", itemId: newItem.id })
    await patchInventory({ action: "delete", itemId: oldItem.id })
    await fetchInventory()
    refetch()
    setLastResult({ item: newItem, autoEquipped: false })
    setPendingReplace(null)
  }

  const handleDiscard = async () => {
    if (!pendingReplace) return
    await patchInventory({ action: "delete", itemId: pendingReplace.newItem.id })
    await fetchInventory()
    setPendingReplace(null)
  }

  const handleDelete = async (id: number) => {
    await patchInventory({ action: "delete", itemId: id })
    await fetchInventory()
  }

  const handleEquipFromStash = async (item: EquipmentItem) => {
    const cur = equippedMap[item.slot]
    if (cur) await patchInventory({ action: "delete", itemId: cur.id })
    await patchInventory({ action: "equip", itemId: item.id })
    await fetchInventory()
    refetch()
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><p className="text-muted-foreground text-sm">불러오는 중...</p></div>
  }

  const equippedMap: Record<string, EquipmentItem> = Object.fromEntries(
    equipment.filter((e) => e.is_equipped === 1).map((e) => [e.slot, e])
  )
  const unequipped = equipment.filter((e) => e.is_equipped === 0)

  return (
    <div className="px-3 pt-3 pb-4 flex flex-col gap-4">
      <GachaBanner
        drawTickets={drawTickets}
        rolling={rolling}
        lastResult={lastResult}
        onRoll={handleGacha}
      />
      {pendingReplace && (
        <ReplaceModal
          pending={pendingReplace}
          onReplace={handleReplace}
          onDiscard={handleDiscard}
        />
      )}
      <EquippedGrid equippedMap={equippedMap} />
      <UnequippedGrid
        items={unequipped}
        equippedMap={equippedMap}
        onEquip={handleEquipFromStash}
        onDelete={handleDelete}
      />
    </div>
  )
}
