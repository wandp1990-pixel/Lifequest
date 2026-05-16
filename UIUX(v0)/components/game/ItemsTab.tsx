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
import ItemDetailSheet from "./items/ItemDetailSheet"
import type { EquipmentItem, GachaResult } from "./items/parts"
import type { GradeRow } from "@/lib/game/gacha"
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
  const [pityCount, setPityCount] = useState(0)
  const [grades, setGrades] = useState<GradeRow[]>([])
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null)

  const fetchInventory = async () => {
    const res = await fetch("/api/inventory")
    if (res.ok) {
      const data = await res.json()
      setEquipment(data.equipment ?? [])
      if (typeof data.pity_count === "number") setPityCount(data.pity_count)
      if (Array.isArray(data.grades)) setGrades(data.grades)
    }
    setLoading(false)
  }

  useEffect(() => { fetchInventory() }, [refreshTick])

  const patchInventory = async (body: object) => {
    const res = await fetch("/api/inventory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const data = await res.json().catch(() => null)
      if (data && typeof data.pity_count === "number") setPityCount(data.pity_count)
    }
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
      if (typeof data.pity_count === "number") setPityCount(data.pity_count)

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
    await patchInventory({ action: "discardGacha", itemId: pendingReplace.newItem.id })
    await fetchInventory()
    setPendingReplace(null)
  }

  const handleDelete = async (id: number) => {
    await patchInventory({ action: "delete", itemId: id })
    await fetchInventory()
  }

  const handleEquipFromStash = async (item: EquipmentItem) => {
    const cur = equippedMap[item.slot]
    // 주의: handleReplace 와 동일 순서(equip new → delete old) 유지.
    //       반대 순서로 호출하면 1차 PATCH 직후 effective max HP 가 일시 감소해
    //       서버측 current_hp 캡으로 인한 영구 손실이 발생함. (검증 보고서 HIGH 2)
    await patchInventory({ action: "equip", itemId: item.id })
    if (cur) await patchInventory({ action: "delete", itemId: cur.id })
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
        pityCount={pityCount}
        grades={grades}
      />
      {pendingReplace && (
        <ReplaceModal
          pending={pendingReplace}
          onReplace={handleReplace}
          onDiscard={handleDiscard}
        />
      )}
      <EquippedGrid equippedMap={equippedMap} onSelect={setSelectedItem} />
      <UnequippedGrid
        items={unequipped}
        equippedMap={equippedMap}
        onEquip={handleEquipFromStash}
        onDelete={handleDelete}
        onSelect={setSelectedItem}
      />
      {selectedItem && (
        <ItemDetailSheet
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onEquip={async (item) => { await handleEquipFromStash(item); setSelectedItem(null) }}
          onDelete={async (id) => { await handleDelete(id); setSelectedItem(null) }}
        />
      )}
    </div>
  )
}
