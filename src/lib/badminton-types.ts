export const PLAYER_LEVELS = [
  { id: "newbie", name: "Newbie" },
  { id: "weak", name: "Y" },
  { id: "weak_plus", name: "Y+" },
  { id: "intermediate_weak", name: "TBY" },
  { id: "intermediate", name: "TB" },
  { id: "intermediate_plus", name: "TB+" },
  { id: "intermediate_advanced", name: "TBK" },
  { id: "advanced", name: "K" },
  { id: "semi_pro", name: "Bán chuyên" },
  { id: "pro", name: "Chuyên nghiệp" },
] as const;

export type PlayerLevelId = (typeof PLAYER_LEVELS)[number]["id"];

export function getLevelName(id: string) {
  return PLAYER_LEVELS.find((l) => l.id === id)?.name ?? id;
}
