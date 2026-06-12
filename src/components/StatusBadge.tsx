import { Clock, Lock, Pencil, Save } from "lucide-react";
import type { Match, MatchPrediction } from "../types";
import { getMatchPredictionEditStatus } from "../lib/scoring";

type StatusBadgeProps = {
  match: Match;
  prediction?: MatchPrediction;
};

export function StatusBadge({ match, prediction }: StatusBadgeProps) {
  const editStatus = getMatchPredictionEditStatus(match.starts_at);

  if (editStatus === "early") {
    return (
      <span className="badge bg-amber-100 text-amber-900 ring-1 ring-amber-200">
        <Clock size={13} className="mr-1" />
        Em breve
      </span>
    );
  }

  if (editStatus === "locked") {
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
