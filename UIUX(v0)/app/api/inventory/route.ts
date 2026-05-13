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
import { MAX_GACHA_COUNT } from "@/lib/constants/gacha"
import { ok, badRequest, withInit } from "@/lib/api/respond"

export const GET = withInit(async () => {
  const equipment = await getEquipment()
  const char = await getCharacter()
  return ok({ equipment, draw_tickets: char.draw_tickets })
})

// 장착/해제/삭제 처리 후 effective 스탯 재계산.
// 장비 변경 후 max_hp/mp 가 감소했으면 current 를 새 max 에 맞게 캡.
export const PATCH = withInit(async (req: NextRequest) => {
  const { action, itemId } = await req.json()
  if (typeof itemId !== "number" || !Number.isFinite(itemId)) return badRequest("itemId 필요")
  if (action === "equip") await equipItem(itemId)
  else if (action === "unequip") await unequipItem(itemId)
  else if (action === "delete") await deleteEquipment(itemId)
  else return badRequest("알 수 없는 action")

  const [char, bcfg, equipment, allSkills] = await Promise.all([
    getCharacter(), getBattleConfig(), getEquipment(), getSkillsWithInvestment(),
  ])
  const equippedOptions = (equipment as unknown as { is_equipped: number; options: string }[])
    .filter((e) => e.is_equipped === 1)
    .map((e) => e.options)
  const cs = buildPlayerCombatStats(char, equippedOptions, bcfg, allSkills)
  const effMaxHp = Math.round(cs.max_hp)
  const effMaxMp = Math.round(cs.max_mp)
  // 장비 제거로 max 가 감소했을 때 current_hp 가 초과하면 new max 로 캡
  if (char.current_hp > effMaxHp || char.current_mp > effMaxMp) {
    await updateCharacter({
      current_hp: Math.min(char.current_hp, effMaxHp),
      current_mp: Math.min(char.current_mp, effMaxMp),
    })
  }
  return ok({ ok: true })
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
  const rolled = rollGachaItems(count, char.level, { grades, slots, abilities, passives })

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
  return ok({ results })
})
