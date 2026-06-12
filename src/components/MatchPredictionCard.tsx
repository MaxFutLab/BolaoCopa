import { Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import {
  formatDateTime,
  formatRelativeLock,
  formatRelativePredictionOpen,
} from "../lib/date";
import { getMatchPredictionEditStatus } from "../lib/scoring";
import type { MatchPrediction, MatchWithTeams } from "../types";
import { StatusBadge } from "./StatusBadge";

type MatchPredictionCardProps = {
  match: MatchWithTeams;
  prediction?: MatchPrediction;
  highlighted?: boolean;
  onSave: (
    match: MatchWithTeams,
    scoreA: number,
    scoreB: number,
  ) => Promise<void>;
};

export function MatchPredictionCard({
  match,
  prediction,
  highlighted = false,
  onSave,
}: MatchPredictionCardProps) {
  const [scoreA, setScoreA] = useState(prediction?.predicted_score_a ?? 0);
  const [scoreB, setScoreB] = useState(prediction?.predicted_score_b ?? 0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const editStatus = getMatchPredictionEditStatus(match.starts_at);
  const locked = editStatus !== "open";

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
      setMessage(error instanceof Error ? error.message : "Nao foi possivel salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article
      id={`match-${match.id}`}
      className={[
        "surface scroll-mt-36 overflow-hidden transition",
        highlighted ? "ring-2 ring-sky-400 ring-offset-2 ring-offset-sky-50" : "",
      ].join(" ")}
    >
      <div className="bg-slate-950 px-4 py-3 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-200">
              {match.stage}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-300">
              {formatDateTime(match.starts_at)} - {getEditWindowText(match.starts_at, editStatus)}
            </p>
          </div>
          <StatusBadge match={match} prediction={prediction} />
        </div>
      </div>

      <form className="grid gap-4 p-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)_auto]">
          <ScoreInput
            label={match.team_a.name}
            value={scoreA}
            locked={locked}
            onChange={setScoreA}
          />

          <div className="grid h-14 place-items-center rounded-md border border-slate-200 bg-slate-50 text-xl font-black text-slate-400">
            x
          </div>

          <ScoreInput
            label={match.team_b.name}
            value={scoreB}
            locked={locked}
            onChange={setScoreB}
          />

          <button
            className="btn-primary col-span-3 h-12 w-full sm:col-span-1 sm:w-auto"
            disabled={locked || saving}
          >
            <Save size={17} />
            {prediction ? "Editar" : "Salvar"}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
          <p className="font-semibold text-slate-500">
            {match.is_finished
              ? `Resultado real: ${match.score_a} x ${match.score_b}`
              : "Resultado real ainda nao informado"}
          </p>
          {prediction ? (
            <p className="rounded-md bg-sky-100 px-3 py-1 font-black text-sky-800">
              {prediction.points} ponto(s)
            </p>
          ) : null}
        </div>

        {message ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">
            {message}
          </p>
        ) : null}
      </form>
    </article>
  );
}

function getEditWindowText(startsAt: string, editStatus: "early" | "open" | "locked") {
  if (editStatus === "early") {
    return `abre em ${formatRelativePredictionOpen(startsAt)}`;
  }

  if (editStatus === "open") {
    return `trava em ${formatRelativeLock(startsAt)}`;
  }

  return "bloqueado para palpites";
}

function ScoreInput({
  label,
  value,
  locked,
  onChange,
}: {
  label: string;
  value: number;
  locked: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="truncate text-sm font-black text-slate-800">{label}</span>
      <input
        className="field h-14 text-center text-xl font-black"
        type="number"
        min={0}
        max={30}
        value={value}
        disabled={locked}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
