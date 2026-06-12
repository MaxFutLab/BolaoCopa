import { CalendarClock, CircleCheck, Medal, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../lib/auth";
import { formatDateTime } from "../lib/date";
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
        title={`Ola, ${profile?.name}`}
        description="Acompanhe seus palpites, proximos jogos e sua posicao no ranking."
      />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Metric icon={Medal} label="Posicao" value={userRank ? `${userRank}o` : "-"} tone="sky" />
        <Metric icon={Trophy} label="Pontuacao" value={String(total)} tone="dark" />
        <Metric icon={CircleCheck} label="Jogos palpitados" value={String(matchPredictions.length)} tone="green" />
        <Metric
          icon={CalendarClock}
          label="Extras confirmados"
          value={`${groupPredictions.length ? "Grupo" : "-"} / ${finalPrediction ? "Final" : "-"}`}
          tone="silver"
        />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <div className="surface tech-panel p-4 sm:p-5">
          <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">
                Agenda
              </p>
              <h3 className="text-xl font-black text-slate-950">Proximos jogos</h3>
            </div>
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
              {nextMatches.length} em breve
            </span>
          </div>

          <div className="relative grid gap-3">
            {nextMatches.map((match) => {
              const prediction = matchPredictions.find((item) => item.match_id === match.id);

              return (
                <div
                  key={match.id}
                  className="grid gap-3 rounded-md border border-slate-200 bg-white/85 p-3 shadow-sm transition hover:border-sky-200 hover:shadow-md sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-slate-950">
                      {match.team_a.name} x {match.team_b.name}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {formatDateTime(match.starts_at)}
                    </p>
                  </div>
                  <div className="flex justify-start sm:justify-end">
                    <StatusBadge match={match} prediction={prediction} />
                  </div>
                </div>
              );
            })}

            {nextMatches.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 bg-white/70 p-5 text-sm font-semibold text-slate-500">
                Nenhum jogo futuro cadastrado.
              </div>
            ) : null}
          </div>
        </div>

        <div className="surface overflow-hidden">
          <div className="bg-slate-950 px-4 py-4 text-white">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-200">
              Ao vivo
            </p>
            <h3 className="text-xl font-black">Topo do ranking</h3>
          </div>
          <div className="grid gap-2 p-4">
            {ranking.slice(0, 5).map((row, index) => (
              <div
                key={row.user_id}
                className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-slate-100 bg-white p-3"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-sky-100 text-sm font-black text-sky-800">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">{row.name}</p>
                  <p className="text-xs font-semibold text-slate-500">
                    {row.match_points} pts em jogos
                  </p>
                </div>
                <span className="rounded-md bg-slate-950 px-3 py-1 font-black text-white">
                  {row.total_points}
                </span>
              </div>
            ))}

            {ranking.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">
                O ranking aparece assim que houver participantes aprovados.
              </div>
            ) : null}
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
  tone: "sky" | "dark" | "green" | "silver";
};

function Metric({ icon: Icon, label, value, tone }: MetricProps) {
  const tones = {
    sky: "bg-sky-100 text-sky-800",
    dark: "bg-slate-950 text-white",
    green: "bg-emerald-100 text-emerald-800",
    silver: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="surface p-3 sm:p-4">
      <div className={`grid h-11 w-11 place-items-center rounded-md ${tones[tone]}`}>
        <Icon size={22} />
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-slate-500 sm:text-sm">
        {label}
      </p>
      <p className="mt-1 break-words text-xl font-black text-slate-950 sm:text-2xl">{value}</p>
    </div>
  );
}
