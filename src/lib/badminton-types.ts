export const PLAYER_LEVELS = [
  { id: "newbie", name: "Newbie" },
  { id: "weak", name: "Yếu" },
  { id: "weak_plus", name: "Yếu+" },
  { id: "intermediate_weak", name: "Trung bình yếu" },
  { id: "intermediate", name: "Trung bình" },
  { id: "intermediate_plus", name: "Trung bình+" },
  { id: "intermediate_advanced", name: "Trung bình khá" },
  { id: "advanced", name: "Khá" },
  { id: "semi_pro", name: "Bán chuyên" },
  { id: "pro", name: "Chuyên nghiệp" },
] as const;

export type PlayerLevelId = (typeof PLAYER_LEVELS)[number]["id"];

export function getLevelName(id: string) {
  return PLAYER_LEVELS.find((l) => l.id === id)?.name ?? id;
}
