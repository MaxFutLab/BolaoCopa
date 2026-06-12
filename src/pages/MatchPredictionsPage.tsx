import { MatchPredictionCard } from "../components/MatchPredictionCard";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../lib/auth";
import { usePoolData } from "../lib/usePoolData";
import type { MatchWithTeams } from "../types";

export function MatchPredictionsPage() {
  const { profile } = useAuth();
  const { matches, matchPredictions, saveMatchPrediction, loading } = usePoolData(
    profile?.id,
  );

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
        description="Edite cada placar ate 1 hora antes do inicio da partida."
      />

      {loading ? (
        <p className="text-sm font-semibold text-slate-500">Carregando jogos...</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {matches.map((match) => (
            <MatchPredictionCard
              key={match.id}
              match={match}
              prediction={matchPredictions.find((item) => item.match_id === match.id)}
              onSave={handleSave}
            />
          ))}
        </div>
      )}
    </>
  );
}
