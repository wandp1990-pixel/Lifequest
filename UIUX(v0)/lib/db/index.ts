export { getClient } from "./client"
export type { Character } from "./types"
export { initDb } from "./schema"

export { getCharacter, updateCharacter, incrementTaskCount } from "./queries/character"
export { addActivityLog, getRecentActivities } from "./queries/activity"
export {
  getChecklistItems, addChecklistLog, addChecklistItem,
  deleteChecklistItem, getTodayCheckedItemIds,
} from "./queries/checklist"
export { getTodoItems, addTodoItem, completeTodoItem, deleteTodoItem } from "./queries/todo"
export { getEquipment, addEquipment, equipItem, unequipItem, deleteEquipment } from "./queries/equipment"
export { addBattleLog } from "./queries/battle"
export { getGameConfig, getGameConfigFull, updateGameConfigValue, getBattleConfig } from "./queries/config"
export { getActivePrompt, updatePromptContent } from "./queries/prompt"
export { getItemGrades, getItemSlots, getAbilityPool, getPassivePool } from "./queries/items"
