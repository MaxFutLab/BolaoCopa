import { Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { formatDateTime, formatRelativeLock } from "../lib/date";
import { canEditMatchPrediction } from "../lib/scoring";
import type { MatchPrediction, MatchWithTeams } from "../types";
import { StatusBadge } from "./StatusBadge";

type MatchPredictionCardProps = {
  match: MatchWithTeams;
  prediction?: MatchPrediction;
  onSave: (
    match: MatchWithTeams,
    scoreA: number,
    scoreB: number,
  ) => Promise<void>;
};

export function MatchPredictionCard({
  match,
  prediction,
  onSave,
}: MatchPredictionCardProps) {
  const [scoreA, setScoreA] = useState(prediction?.predicted_score_a ?? 0);
  const [scoreB, setScoreB] = useState(prediction?.predicted_score_b ?? 0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const locked = !canEditMatchPrediction(match.starts_at);

  useEffect(() => {
    setScoreA(prediction?.predicted_score_a ?? 0);
    setScoreB(prediction?.predicted_score_b ?? 0);
  }, [prediction?.predicted_score_a, prediction?.predicted_score_b]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await onSave(match, scoreA, scoreB);
      setMessage("Palpite salvo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="surface p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-700">
            {match.stage}
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-950">
            {match.team_a.name} x {match.team_b.name}
          </h3>
          <p className="text-sm text-slate-500">
            {formatDateTime(match.starts_at)} · trava em {formatRelativeLock(match.starts_at)}
          </p>
        </div>
        <StatusBadge match={match} prediction={prediction} />
      </div>

      <form className="grid gap-4 sm:grid-cols-[1fr_auto_1fr_auto]" onSubmit={handleSubmit}>
        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-700">{match.team_a.name}</span>
          <input
            className="field text-center text-lg font-black"
            type="number"
            min={0}
            max={30}
            value={scoreA}
            disabled={locked}
            onChange={(event) => setScoreA(Number(event.target.value))}
          />
        </label>
        <div className="hidden items-end pb-2 text-xl font-black text-slate-300 sm:flex">
          x
        </div>
        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-700">{match.team_b.name}</span>
          <input
            className="field text-center text-lg font-black"
            type="number"
            min={0}
            max={30}
            value={scoreB}
            disabled={locked}
            onChange={(event) => setScoreB(Number(event.target.value))}
          />
        </label>
        <div className="flex items-end">
          <button className="btn-primary w-full sm:w-auto" disabled={locked || saving}>
            <Save size={17} />
            {prediction ? "Editar" : "Salvar"}
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-slate-500">
          {match.is_finished
            ? `Resultado real: ${match.score_a} x ${match.score_b}`
            : "Resultado real ainda não informado"}
        </p>
        {prediction ? (
          <p className="font-bold text-emerald-800">{prediction.points} ponto(s)</p>
        ) : null}
      </div>
      {message ? <p className="mt-2 text-sm font-semibold text-emerald-800">{message}</p> : null}
    </article>
  );
}
