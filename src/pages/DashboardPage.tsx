import { CalendarClock, CircleCheck, Medal, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { formatDateTime } from "../lib/date";
import { useAuth } from "../lib/auth";
import { calculateTotalUserPoints } from "../lib/scoring";
import { usePoolData } from "../lib/usePoolData";

export function DashboardPage() {
  const { profile } = useAuth();
  const { matches, matchPredictions, ranking, groupPredictions, finalPrediction, loading } =
    usePoolData(profile?.id);
  const userRank = ranking.findIndex((row) => row.user_id === profile?.id) + 1;
  const total = profile ? calculateTotalUserPoints(profile.id, ranking) : 0;
  const nextMatches = matches
    .filter((match) => new Date(match.starts_at).getTime() > Date.now())
    .slice(0, 4);

  if (loading) return <p className="text-sm font-semibold text-slate-500">Carregando...</p>;

  return (
    <>
      <PageHeader
        eyebrow="Painel"
        title={`Olá, ${profile?.name}`}
        description="Acompanhe seus palpites, próximos jogos e sua posição no ranking."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <Metric icon={Medal} label="Posição" value={userRank ? `${userRank}º` : "-"} />
        <Metric icon={Trophy} label="Pontuação" value={String(total)} />
        <Metric icon={CircleCheck} label="Jogos palpitados" value={String(matchPredictions.length)} />
        <Metric
          icon={CalendarClock}
          label="Extras confirmados"
          value={`${groupPredictions.length ? 1 : 0}/${finalPrediction ? 1 : 0}`}
        />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="surface p-4">
          <h3 className="mb-4 text-lg font-black text-emerald-950">Próximos jogos</h3>
          <div className="grid gap-3">
            {nextMatches.map((match) => {
              const prediction = matchPredictions.find((item) => item.match_id === match.id);
              return (
                <div
                  key={match.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-100 p-3"
                >
                  <div>
                    <p className="font-black text-slate-950">
                      {match.team_a.name} x {match.team_b.name}
                    </p>
                    <p className="text-sm text-slate-500">{formatDateTime(match.starts_at)}</p>
                  </div>
                  <StatusBadge match={match} prediction={prediction} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="surface p-4">
          <h3 className="mb-4 text-lg font-black text-emerald-950">Topo do ranking</h3>
          <div className="grid gap-3">
            {ranking.slice(0, 5).map((row, index) => (
              <div key={row.user_id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">
                    {index + 1}. {row.name}
                  </p>
                  <p className="text-xs text-slate-500">{row.match_points} pts em jogos</p>
                </div>
                <span className="rounded-md bg-emerald-50 px-3 py-1 font-black text-emerald-800">
                  {row.total_points}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

type MetricProps = {
  icon: LucideIcon;
  label: string;
  value: string;
};

function Metric({ icon: Icon, label, value }: MetricProps) {
  return (
    <div className="surface p-4">
      <Icon className="text-red-700" size={22} />
      <p className="mt-3 text-sm font-semibold text-slate-500">{label}</p>
      <p className="text-2xl font-black text-emerald-950">{value}</p>
    </div>
  );
}
