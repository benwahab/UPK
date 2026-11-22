export type RankInput = {
  textScore: number;
  verified: boolean;
  hasPhone: boolean;
  distanceM: number | null;
};

export function rankScore(input: RankInput): number {
  const verification = input.verified ? 15 : 0;
  const phone = input.hasPhone ? 5 : 0;
  const distance = input.distanceM === null ? 0 : -Math.min(input.distanceM / 1000, 50);
  return input.textScore * 100 + verification + phone + distance;
}
