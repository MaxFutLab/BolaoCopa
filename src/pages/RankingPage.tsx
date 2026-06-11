import { RankingTable } from "../components/RankingTable";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../lib/auth";
import { usePoolData } from "../lib/usePoolData";

export function RankingPage() {
  const { profile } = useAuth();
  const { ranking, loading } = usePoolData(profile?.id);

  return (
    <>
      <PageHeader
        eyebrow="Ranking"
        title="Classificação geral"
        description="Atualização em tempo real quando resultados ou palpites pontuados mudam."
      />

      {loading ? (
        <p className="text-sm font-semibold text-slate-500">Carregando ranking...</p>
      ) : (
        <RankingTable rows={ranking} currentUserId={profile?.id} />
      )}
    </>
  );
}
