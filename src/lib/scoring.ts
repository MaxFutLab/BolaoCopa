import type { Match, MatchPrediction, RankingRow } from "../types";

const ONE_HOUR_MS = 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * ONE_HOUR_MS;

export type MatchPredictionEditStatus = "early" | "open" | "locked";

export function getMatchPredictionEditStatus(
  startsAt: string | Date,
): MatchPredictionEditStatus {
  const start = new Date(startsAt).getTime();
  const diff = start - Date.now();

  if (diff <= ONE_HOUR_MS) return "locked";
  if (diff > TWENTY_FOUR_HOURS_MS) return "early";
  return "open";
}

export function canEditMatchPrediction(startsAt: string | Date): boolean {
  return getMatchPredictionEditStatus(startsAt) === "open";
}

function outcome(scoreA: number, scoreB: number): "A" | "B" | "D" {
  if (scoreA > scoreB) return "A";
  if (scoreB > scoreA) return "B";
  return "D";
}

export function calculateMatchPoints(
  prediction: Pick<
    MatchPrediction,
    "predicted_score_a" | "predicted_score_b"
  >,
  match: Pick<Match, "score_a" | "score_b" | "is_finished">,
): number {
  if (!match.is_finished || match.score_a === null || match.score_b === null) {
    return 0;
  }

  if (
    prediction.predicted_score_a === match.score_a &&
    prediction.predicted_score_b === match.score_b
  ) {
    return 3;
  }

  return outcome(prediction.predicted_score_a, prediction.predicted_score_b) ===
    outcome(match.score_a, match.score_b)
    ? 1
    : 0;
}

export function calculateTotalUserPoints(
  userId: string,
  ranking: RankingRow[],
): number {
  return ranking.find((row) => row.user_id === userId)?.total_points ?? 0;
}

export function updateRankingRealtime(rows: RankingRow[]): RankingRow[] {
  return [...rows].sort((a, b) => {
    if (b.total_points !== a.total_points) {
      return b.total_points - a.total_points;
    }
    if (b.match_points !== a.match_points) {
      return b.match_points - a.match_points;
    }
    return a.name.localeCompare(b.name);
  });
}
