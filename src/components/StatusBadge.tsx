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
      <span className="badge bg-slate-900 text-white shadow-sm shadow-slate-900/20">
        <Lock size={13} className="mr-1" />
        Bloqueado
      </span>
    );
  }

  if (prediction) {
    return (
      <span className="badge bg-sky-100 text-sky-800 ring-1 ring-sky-200">
        <Save size={13} className="mr-1" />
        Salvo
      </span>
    );
  }

  return (
    <span className="badge bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200">
      <Pencil size={13} className="mr-1" />
      Aberto
    </span>
  );
}
