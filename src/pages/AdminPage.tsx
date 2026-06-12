import { FormEvent, ReactNode, useState } from "react";
import { Check, ChevronDown, RefreshCw, Save, ShieldAlert, X } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { RankingTable } from "../components/RankingTable";
import { useAuth } from "../lib/auth";
import { useCompetition } from "../lib/competitions";
import { formatDateTime } from "../lib/date";
import { usePoolData } from "../lib/usePoolData";
import type { MatchWithTeams, PoolMembershipWithProfile, Team } from "../types";

export function AdminPage() {
  const { profile } = useAuth();
  const { pendingMemberships, updateMembershipStatus } = useCompetition();
  const {
    teams,
    matches,
    ranking,
    saveMatchResult,
    recalculateScores,
    saveRealGroupClassified,
    saveRealPodium,
    loading,
  } = usePoolData(profile?.id);
  const [message, setMessage] = useState("");

  if (!profile?.is_admin) {
    return (
      <section className="surface p-6">
        <ShieldAlert className="text-red-700" />
        <h2 className="mt-3 text-xl font-black text-slate-950">Acesso restrito</h2>
        <p className="text-sm text-slate-600">Apenas administradores podem abrir esta area.</p>
      </section>
    );
  }

  async function runAction(action: () => Promise<void>, success: string) {
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Acao nao concluida.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Gerenciar bolao"
        description="Aprove jogadores, lance resultados reais e recalcule a pontuacao. Cadastro, edicao e remocao de jogos estao temporariamente desativados."
      />

      {message ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
          {message}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm font-semibold text-slate-500">Carregando admin...</p>
      ) : (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
          <MembershipRequests
            requests={pendingMemberships}
            onUpdate={(membershipId, status) =>
              runAction(
                () => updateMembershipStatus(membershipId, status),
                status === "approved" ? "Participante aprovado." : "Pedido recusado.",
              )
            }
          />

          <MatchResultsPanel
            matches={matches}
            onRecalculate={() => runAction(recalculateScores, "Pontuacao recalculada.")}
            onSaveResult={(matchId, scoreA, scoreB) =>
              runAction(
                () => saveMatchResult(matchId, scoreA, scoreB),
                "Resultado salvo.",
              )
            }
          />

          <section className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <GroupResultsForm
              teams={teams}
              onSave={(value) =>
                runAction(
                  () => saveRealGroupClassified(value),
                  "Classificados reais salvos.",
                )
              }
            />
            <PodiumResultsForm
              teams={teams}
              onSave={(value) =>
                runAction(() => saveRealPodium(value), "Podio real salvo.")
              }
            />
          </section>

          <section>
            <div className="mb-3">
              <h3 className="text-lg font-black text-slate-950">Usuarios e pontos</h3>
            </div>
            <RankingTable rows={ranking} currentUserId={profile.id} />
          </section>
        </div>
      )}
    </>
  );
}

function MembershipRequests({
  requests,
  onUpdate,
}: {
  requests: PoolMembershipWithProfile[];
  onUpdate: (membershipId: string, status: "approved" | "rejected") => Promise<void>;
}) {
  return (
    <section className="surface p-4">
      <div className="mb-4">
        <h3 className="text-lg font-black text-slate-950">Aprovar jogadores</h3>
        <p className="text-sm text-slate-500">
          Aprove quem pode entrar em cada nucleo de amigos.
        </p>
      </div>

      {requests.length === 0 ? (
        <p className="rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-500">
          Nenhum pedido pendente.
        </p>
      ) : (
        <div className="grid gap-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="grid gap-3 rounded-md border border-slate-100 p-3 md:grid-cols-[1fr_auto] md:items-center"
            >
              <div>
                <p className="font-black text-slate-950">
                  {request.user_name ?? request.user_email ?? request.user_id}
                </p>
                <p className="text-sm text-slate-500">
                  Quer entrar em {request.pool_name ?? request.pool_id}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn-primary"
                  onClick={() => void onUpdate(request.id, "approved")}
                >
                  <Check size={17} />
                  Aprovar
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => void onUpdate(request.id, "rejected")}
                >
                  <X size={17} />
                  Recusar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MatchResultsPanel({
  matches,
  onRecalculate,
  onSaveResult,
}: {
  matches: MatchWithTeams[];
  onRecalculate: () => Promise<void>;
  onSaveResult: (matchId: string, scoreA: number, scoreB: number) => Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState({
    finished: true,
    upcoming: false,
  });
  const sortedMatches = [...matches].sort(
    (first, second) =>
      new Date(first.starts_at).getTime() - new Date(second.starts_at).getTime(),
  );
  const finishedMatches = sortedMatches.filter((match) => match.is_finished);
  const upcomingMatches = sortedMatches.filter((match) => !match.is_finished);

  function toggleGroup(group: "finished" | "upcoming") {
    setCollapsed((current) => ({ ...current, [group]: !current[group] }));
  }

  return (
    <section className="surface p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">Resultados dos jogos</h3>
          <p className="text-sm text-slate-500">
            Ao salvar um resultado, a pontuacao dos palpites daquele jogo e recalculada.
          </p>
        </div>
        <button className="btn-secondary" onClick={() => void onRecalculate()}>
          <RefreshCw size={17} />
          Recalcular tudo
        </button>
      </div>

      <div className="grid gap-3">
        <MatchResultsGroup
          title="Jogos ainda por acontecer"
          description="Partidas abertas ou aguardando resultado."
          count={upcomingMatches.length}
          collapsed={collapsed.upcoming}
          onToggle={() => toggleGroup("upcoming")}
        >
          {upcomingMatches.map((match) => (
            <ResultRow
              key={match.id}
              match={match}
              onSave={(scoreA, scoreB) => onSaveResult(match.id, scoreA, scoreB)}
            />
          ))}
        </MatchResultsGroup>

        <MatchResultsGroup
          title="Jogos ja realizados"
          description="Partidas finalizadas ficam recolhidas por padrao para manter a pagina leve."
          count={finishedMatches.length}
          collapsed={collapsed.finished}
          onToggle={() => toggleGroup("finished")}
        >
          {finishedMatches.map((match) => (
            <ResultRow
              key={match.id}
              match={match}
              onSave={(scoreA, scoreB) => onSaveResult(match.id, scoreA, scoreB)}
            />
          ))}
        </MatchResultsGroup>
      </div>
    </section>
  );
}

function MatchResultsGroup({
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
    <div className="overflow-hidden rounded-md border border-slate-100 bg-white">
      <button
        className="flex w-full items-center justify-between gap-3 bg-slate-50 px-3 py-3 text-left transition hover:bg-sky-50"
        type="button"
        aria-expanded={!collapsed}
        onClick={onToggle}
      >
        <span className="min-w-0">
          <span className="block text-sm font-black text-slate-950">{title}</span>
          <span className="block text-xs font-semibold text-slate-500">{description}</span>
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
        <div className="grid gap-3 p-3">
          {count > 0 ? (
            children
          ) : (
            <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-500">
              Nenhum jogo neste grupo.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function GroupResultsForm({
  teams,
  onSave,
}: {
  teams: Team[];
  onSave: (value: Record<string, string[]>) => Promise<void>;
}) {
  const groups = Array.from(new Set(teams.map((team) => team.group_name))).sort();
  const [choices, setChoices] = useState<Record<string, string[]>>({});

  function updateChoice(group: string, index: number, value: string) {
    const current = choices[group] ?? [];
    const next = [...current];
    next[index] = value;
    setChoices({ ...choices, [group]: next });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = Object.fromEntries(
      groups.map((group) => {
        const groupTeams = teams.filter((team) => team.group_name === group);
        const selected = choices[group] ?? [
          groupTeams[0]?.id ?? "",
          groupTeams[1]?.id ?? "",
        ];
        return [group, selected.filter(Boolean)];
      }),
    );
    await onSave(payload);
  }

  return (
    <form className="surface grid min-w-0 gap-3 p-4" onSubmit={handleSubmit}>
      <h3 className="text-lg font-black text-slate-950">Classificados reais</h3>
      {groups.map((group) => {
        const groupTeams = teams.filter((team) => team.group_name === group);
        return (
          <div key={group} className="grid gap-2 rounded-md bg-slate-50 p-3">
            <p className="text-sm font-black text-slate-800">Grupo {group}</p>
            <div className="grid min-w-0 gap-2 sm:grid-cols-2">
              {[0, 1].map((index) => (
                <select
                  key={index}
                  className="field"
                  value={choices[group]?.[index] ?? groupTeams[index]?.id ?? ""}
                  onChange={(event) => updateChoice(group, index, event.target.value)}
                >
                  {groupTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          </div>
        );
      })}
      <button className="btn-primary">
        <Save size={17} />
        Salvar classificados reais
      </button>
    </form>
  );
}

function PodiumResultsForm({
  teams,
  onSave,
}: {
  teams: Team[];
  onSave: (value: {
    champion_id: string;
    runner_up_id: string;
    third_place_id: string;
  }) => Promise<void>;
}) {
  const [championId, setChampionId] = useState("");
  const [runnerUpId, setRunnerUpId] = useState("");
  const [thirdPlaceId, setThirdPlaceId] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave({
      champion_id: championId || teams[0]?.id || "",
      runner_up_id: runnerUpId || teams[1]?.id || "",
      third_place_id: thirdPlaceId || teams[2]?.id || "",
    });
  }

  return (
    <form className="surface grid min-w-0 gap-3 p-4" onSubmit={handleSubmit}>
      <h3 className="text-lg font-black text-slate-950">Podio real</h3>
      <TeamSelect label="Campeao" teams={teams} value={championId} onChange={setChampionId} />
      <TeamSelect label="Vice" teams={teams} value={runnerUpId} onChange={setRunnerUpId} />
      <TeamSelect
        label="Terceiro"
        teams={teams}
        value={thirdPlaceId}
        onChange={setThirdPlaceId}
      />
      <button className="btn-primary">
        <Save size={17} />
        Salvar podio real
      </button>
    </form>
  );
}

function TeamSelect({
  label,
  teams,
  value,
  onChange,
}: {
  label: string;
  teams: Team[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function ResultRow({
  match,
  onSave,
}: {
  match: MatchWithTeams;
  onSave: (scoreA: number, scoreB: number) => Promise<void>;
}) {
  const [scoreA, setScoreA] = useState(match.score_a ?? 0);
  const [scoreB, setScoreB] = useState(match.score_b ?? 0);

  return (
    <div className="grid gap-3 rounded-md border border-slate-100 p-3 md:grid-cols-[1fr_90px_90px_auto] md:items-end">
      <div>
        <p className="font-black text-slate-950">
          {match.team_a.name} x {match.team_b.name}
        </p>
        <p className="text-sm text-slate-500">
          {match.stage} - {formatDateTime(match.starts_at)}
        </p>
      </div>
      <input
        className="field text-center font-black"
        type="number"
        min={0}
        value={scoreA}
        onChange={(event) => setScoreA(Number(event.target.value))}
      />
      <input
        className="field text-center font-black"
        type="number"
        min={0}
        value={scoreB}
        onChange={(event) => setScoreB(Number(event.target.value))}
      />
      <button className="btn-secondary" onClick={() => void onSave(scoreA, scoreB)}>
        <Save size={17} />
        Salvar
      </button>
    </div>
  );
}
