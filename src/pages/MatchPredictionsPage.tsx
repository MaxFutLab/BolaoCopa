import { ChevronDown } from "lucide-react";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MatchPredictionCard } from "../components/MatchPredictionCard";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../lib/auth";
import { getMatchPredictionEditStatus } from "../lib/scoring";
import { usePoolData } from "../lib/usePoolData";
import type { MatchWithTeams } from "../types";

export function MatchPredictionsPage() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const highlightedMatchId = searchParams.get("jogo");
  const { matches, matchPredictions, saveMatchPrediction, loading } = usePoolData(
    profile?.id,
  );
  const [collapsed, setCollapsed] = useState({
    available: false,
    finished: true,
    upcoming: false,
  });
  const sortedMatches = useMemo(
    () =>
      [...matches].sort(
        (first, second) =>
          new Date(first.starts_at).getTime() - new Date(second.starts_at).getTime(),
      ),
    [matches],
  );
  const availableMatches = useMemo(
    () =>
      sortedMatches.filter(
        (match) =>
          !hasMatchPassed(match) &&
          getMatchPredictionEditStatus(match.starts_at) === "open",
      ),
    [sortedMatches],
  );
  const upcomingMatches = useMemo(
    () =>
      sortedMatches.filter(
        (match) =>
          !hasMatchPassed(match) &&
          getMatchPredictionEditStatus(match.starts_at) !== "open",
      ),
    [sortedMatches],
  );
  const finishedMatches = useMemo(
    () => sortedMatches.filter((match) => hasMatchPassed(match)),
    [sortedMatches],
  );

  useEffect(() => {
    if (!highlightedMatchId || loading) return;

    const selectedMatch = matches.find((match) => match.id === highlightedMatchId);
    if (!selectedMatch) return;

    setCollapsed((current) => {
      const selectedGroup = getMatchGroup(selectedMatch);
      const next = {
        ...current,
        available: selectedGroup === "available" ? false : current.available,
        upcoming: selectedGroup === "upcoming" ? false : current.upcoming,
        finished: selectedGroup === "finished" ? false : current.finished,
      };

      return next.available === current.available &&
        next.finished === current.finished &&
        next.upcoming === current.upcoming
        ? current
        : next;
    });

    const timeout = window.setTimeout(() => {
      document
        .getElementById(`match-${highlightedMatchId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [highlightedMatchId, loading, matches]);

  function toggleGroup(group: "available" | "finished" | "upcoming") {
    setCollapsed((current) => ({ ...current, [group]: !current[group] }));
  }

  async function handleSave(match: MatchWithTeams, scoreA: number, scoreB: number) {
    await saveMatchPrediction({
      match,
      predicted_score_a: scoreA,
      predicted_score_b: scoreB,
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Palpites"
        title="Jogos"
        description="Cada palpite libera 24h antes do jogo e bloqueia novamente 1h antes da partida."
      />

      {loading ? (
        <p className="text-sm font-semibold text-slate-500">Carregando jogos...</p>
      ) : (
        <div className="grid gap-4">
          <MatchPredictionGroup
            title="Jogos disponiveis para palpite"
            description="Partidas dentro da janela de 24h ate 1h antes do inicio."
            count={availableMatches.length}
            collapsed={collapsed.available}
            onToggle={() => toggleGroup("available")}
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {availableMatches.map((match) => (
                <MatchPredictionCard
                  key={match.id}
                  match={match}
                  prediction={matchPredictions.find((item) => item.match_id === match.id)}
                  onSave={handleSave}
                  highlighted={match.id === highlightedMatchId}
                />
              ))}
            </div>
          </MatchPredictionGroup>

          <MatchPredictionGroup
            title="Jogos ainda por acontecer"
            description="Partidas futuras que ainda nao estao liberadas ou ja entraram na ultima hora."
            count={upcomingMatches.length}
            collapsed={collapsed.upcoming}
            onToggle={() => toggleGroup("upcoming")}
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {upcomingMatches.map((match) => (
                <MatchPredictionCard
                  key={match.id}
                  match={match}
                  prediction={matchPredictions.find((item) => item.match_id === match.id)}
                  onSave={handleSave}
                  highlighted={match.id === highlightedMatchId}
                />
              ))}
            </div>
          </MatchPredictionGroup>

          <MatchPredictionGroup
            title="Jogos ja realizados"
            description="Partidas finalizadas ficam recolhidas por padrao."
            count={finishedMatches.length}
            collapsed={collapsed.finished}
            onToggle={() => toggleGroup("finished")}
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {finishedMatches.map((match) => (
                <MatchPredictionCard
                  key={match.id}
                  match={match}
                  prediction={matchPredictions.find((item) => item.match_id === match.id)}
                  onSave={handleSave}
                  highlighted={match.id === highlightedMatchId}
                />
              ))}
            </div>
          </MatchPredictionGroup>
        </div>
      )}
    </>
  );
}

function hasMatchPassed(match: MatchWithTeams) {
  return match.is_finished || new Date(match.starts_at).getTime() <= Date.now();
}

function getMatchGroup(match: MatchWithTeams): "available" | "upcoming" | "finished" {
  if (hasMatchPassed(match)) return "finished";
  return getMatchPredictionEditStatus(match.starts_at) === "open"
    ? "available"
    : "upcoming";
}

function MatchPredictionGroup({
  title,
  description,
  count,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="surface overflow-hidden">
      <button
        className="flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-4 text-left transition hover:bg-sky-50"
        type="button"
        aria-expanded={!collapsed}
        onClick={onToggle}
      >
        <span className="min-w-0">
          <span className="block text-lg font-black text-slate-950">{title}</span>
          <span className="block text-sm font-semibold text-slate-500">{description}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-black text-white">
            {count}
          </span>
          <ChevronDown
            size={18}
            className={[
              "text-slate-500 transition",
              collapsed ? "-rotate-90" : "rotate-0",
            ].join(" ")}
          />
        </span>
      </button>

      {!collapsed ? (
        <div className="p-4">
          {count > 0 ? (
            children
          ) : (
            <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-500">
              Nenhum jogo neste grupo.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
