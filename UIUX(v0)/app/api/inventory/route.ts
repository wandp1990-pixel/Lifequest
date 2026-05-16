import { NextRequest } from "next/server"
import {
  getEquipment,
  equipItem,
  unequipItem,
  deleteEquipment,
  getCharacter,
  updateCharacter,
  getItemGrades,
  getItemSlots,
  getAbilityPool,
  getPassivePool,
  getBattleConfig,
  getSkillsWithInvestment,
} from "@/lib/db"
import { now } from "@/lib/time/kst"
import { tx } from "@/lib/db/queries/_helpers"
import { buildPlayerCombatStats } from "@/lib/battle"
import {
  rollGachaItems,
  type GradeRow,
  type SlotRow,
  type AbilityRow,
  type PassiveRow,
} from "@/lib/game/gacha"
import { applyItemPassives } from "@/lib/battle"
import { MAX_GACHA_COUNT } from "@/lib/constants/gacha"
import { ok, badRequest, withInit } from "@/lib/api/respond"

export const GET = withInit(async () => {
  const [equipment, char, grades] = await Promise.all([getEquipment(), getCharacter(), getItemGrades()])
  return ok({ equipment, draw_tickets: char.draw_tickets, pity_count: char.pity_count ?? 0, grades })
})

// 장착/해제/삭제 처리 후 effective 스탯 재계산.
// 장비 변경 후 max_hp/mp 가 감소했으면 current 를 새 max 에 맞게 캡.
// discardGacha: 가챠 결과 폐기. pity_count 증가.
// equip: 장착 수락 → pity_count 0 으로 리셋 (의도된 장착 = 만족).
export const PATCH = withInit(async (req: NextRequest) => {
  const { action, itemId } = await req.json()
  if (typeof itemId !== "number" || !Number.isFinite(itemId)) return badRequest("itemId 필요")
  if (action === "equip") {
    await equipItem(itemId)
    await updateCharacter({ pity_count: 0 })
  }
  else if (action === "unequip") await unequipItem(itemId)
  else if (action === "delete") await deleteEquipment(itemId)
  else if (action === "discardGacha") {
    await deleteEquipment(itemId)
    const cur = await getCharacter()
    await updateCharacter({ pity_count: (cur.pity_count ?? 0) + 1 })
  }
  else return badRequest("알 수 없는 action")

  const [char, bcfg, equipment, allSkills] = await Promise.all([
    getCharacter(), getBattleConfig(), getEquipment(), getSkillsWithInvestment(),
  ])
  const equippedOptions = (equipment as unknown as { is_equipped: number; options: string }[])
    .filter((e) => e.is_equipped === 1)
    .map((e) => e.options)
  const boostedSkills = applyItemPassives(allSkills, equippedOptions)
  const cs = buildPlayerCombatStats(char, equippedOptions, bcfg, boostedSkills)
  const effMaxHp = Math.round(cs.max_hp)
  const effMaxMp = Math.round(cs.max_mp)
  // 정책: 장비 변경은 회복 기준점으로 취급 (last_regen_at 리셋).
  // 누락 시: 장비 해제로 max 감소했으나 current 가 cap 에 안 걸린 경우,
  // 직후 calcRegen 이 과거 시각 기준 elapsed 로 비정상 회복하는 버그.
  // max 변경 여부와 무관하게 모든 장비 변경 액션 후 갱신.
  const updateFields: Record<string, number | string> = { last_regen_at: now() }
  if (char.current_hp > effMaxHp || char.current_mp > effMaxMp) {
    updateFields.current_hp = Math.min(char.current_hp, effMaxHp)
    updateFields.current_mp = Math.min(char.current_mp, effMaxMp)
  }
  await updateCharacter(updateFields)
  return ok({ ok: true, pity_count: char.pity_count ?? 0 })
})

// 가챠: count 개 장비 생성 및 뽑기권 차감.
// 순수 롤링 로직은 lib/game/gacha.ts 가 담당. 이 라우트는 DB IO + 트랜잭션만.
export const POST = withInit(async (req: NextRequest) => {
  const { count = 1 } = await req.json()

  if (!Number.isInteger(count) || count < 1 || count > MAX_GACHA_COUNT) {
    return badRequest(`count는 1 이상 ${MAX_GACHA_COUNT} 이하의 정수여야 합니다`)
  }

  const char = await getCharacter()
  if (char.draw_tickets < count) return badRequest("뽑기권이 부족합니다")

  const [grades, slots, abilities, passives] = await Promise.all([
    getItemGrades() as Promise<unknown> as Promise<GradeRow[]>,
    getItemSlots() as Promise<unknown> as Promise<SlotRow[]>,
    getAbilityPool() as Promise<unknown> as Promise<AbilityRow[]>,
    getPassivePool() as Promise<unknown> as Promise<PassiveRow[]>,
  ])

  // 가챠 결과를 먼저 모두 결정 (랜덤). DB 쓰기는 트랜잭션 안에서 한 번에.
  // pity_count 만큼 상위 등급(S/SR/SSR/UR) 가중치 가산.
  const rolled = rollGachaItems(count, char.level, { grades, slots, abilities, passives }, char.pity_count ?? 0)

  // 트랜잭션: 티켓 차감 + N개 INSERT atomic.
  // 차감은 conditional UPDATE 라 race 시 한 쪽만 통과 → rollback.
  const insertedIds = await tx(async (t) => {
    const upRes = await t.execute({
      sql: "UPDATE character SET draw_tickets = draw_tickets - ? WHERE id=1 AND draw_tickets >= ?",
      args: [count, count],
    })
    if (upRes.rowsAffected === 0) throw new Error("뽑기권이 부족합니다")
    const ts = now()
    const ids: number[] = []
    for (const item of rolled) {
      const r = await t.execute({
        sql: "INSERT INTO equipment (slot,name,grade,base_stat,options,roll_level,is_equipped,created_at) VALUES (?,?,?,?,?,?,0,?)",
        args: [item.slot, item.name, item.grade, item.mainValue, JSON.stringify(item.options), char.level, ts],
      })
      ids.push(Number(r.lastInsertRowid))
    }
    return ids
  }).catch((e) => {
    if (e instanceof Error && e.message === "뽑기권이 부족합니다") return null
    throw e
  })

  if (insertedIds === null) return badRequest("뽑기권이 부족합니다")

  const results = rolled.map((item, i) => ({
    id: insertedIds[i],
    name: item.name,
    grade: item.grade,
    slot: item.slot,
    rollLevel: char.level,
    mainValue: item.mainValue,
    options: item.options,
  }))
  return ok({ results, pity_count: char.pity_count ?? 0 })
})
