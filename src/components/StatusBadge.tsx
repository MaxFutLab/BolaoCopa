import { Lock, Pencil, Save } from "lucide-react";
import type { Match, MatchPrediction } from "../types";
import { canEditMatchPrediction } from "../lib/scoring";

type StatusBadgeProps = {
  match: Match;
  prediction?: MatchPrediction;
};

export function StatusBadge({ match, prediction }: StatusBadgeProps) {
  const canEdit = canEditMatchPrediction(match.starts_at);

  if (!canEdit) {
    return (
      <span className="badge bg-slate-100 text-slate-700">
        <Lock size={13} className="mr-1" />
        Bloqueado
      </span>
    );
  }

  if (prediction) {
    return (
      <span className="badge bg-blue-50 text-blue-700">
        <Save size={13} className="mr-1" />
        Salvo
      </span>
    );
  }

  return (
    <span className="badge bg-emerald-50 text-emerald-800">
      <Pencil size={13} className="mr-1" />
      Aberto
    </span>
  );
}
