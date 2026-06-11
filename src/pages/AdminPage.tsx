import { FormEvent, useEffect, useState } from "react";
import {
  Check,
  Edit2,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { RankingTable } from "../components/RankingTable";
import { useAuth } from "../lib/auth";
import { useCompetition } from "../lib/competitions";
import { usePoolData } from "../lib/usePoolData";
import type { Match, MatchWithTeams, PoolMembershipWithProfile, Team } from "../types";

export function AdminPage() {
  const { profile } = useAuth();
  const { pendingMemberships, updateMembershipStatus } = useCompetition();
  const {
    teams,
    matches,
    ranking,
    createTeam,
    updateTeam,
    deleteTeam,
    createMatch,
    updateMatch,
    deleteMatch,
    saveMatchResult,
    recalculateScores,
    saveRealGroupClassified,
    saveRealPodium,
    loading,
  } = usePoolData(profile?.id);
  const [message, setMessage] = useState("");
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingMatch, setEditingMatch] = useState<MatchWithTeams | null>(null);

  if (!profile?.is_admin) {
    return (
      <section className="surface p-6">
        <ShieldAlert className="text-red-700" />
        <h2 className="mt-3 text-xl font-black text-slate-950">Acesso restrito</h2>
        <p className="text-sm text-slate-600">Apenas administradores podem abrir esta área.</p>
      </section>
    );
  }

  async function runAction(action: () => Promise<void>, success: string) {
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ação não concluída.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Gerenciar bolão"
        description="Cadastre seleções, jogos, resultados reais e recalcule a pontuação."
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
          <section className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <TeamForm
              team={editingTeam}
              onCreate={(team) =>
                runAction(() => createTeam(team), "Seleção cadastrada.")
              }
              onUpdate={(teamId, team) =>
                runAction(() => updateTeam(teamId, team), "SeleÃ§Ã£o atualizada.")
              }
              onCancel={() => setEditingTeam(null)}
            />
            <MatchForm
              teams={teams}
              match={editingMatch}
              onCreate={(match) => runAction(() => createMatch(match), "Jogo cadastrado.")}
              onUpdate={(matchId, match) =>
                runAction(() => updateMatch(matchId, match), "Jogo atualizado.")
              }
              onCancel={() => setEditingMatch(null)}
            />
          </section>

          <section className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <TeamsManager
              teams={teams}
              onEdit={setEditingTeam}
              onDelete={(teamId) =>
                runAction(() => deleteTeam(teamId), "SeleÃ§Ã£o removida.")
              }
            />
            <MatchesManager
              matches={matches}
              onEdit={setEditingMatch}
              onDelete={(matchId) =>
                runAction(() => deleteMatch(matchId), "Jogo removido.")
              }
            />
          </section>

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
                runAction(() => saveRealPodium(value), "Pódio real salvo.")
              }
            />
          </section>

          <MembershipRequests
            requests={pendingMemberships}
            onUpdate={(membershipId, status) =>
              runAction(
                () => updateMembershipStatus(membershipId, status),
                status === "approved" ? "Participante aprovado." : "Pedido recusado.",
              )
            }
          />

          <section className="surface p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-emerald-950">Resultados dos jogos</h3>
                <p className="text-sm text-slate-500">
                  Ao salvar um resultado, a pontuação dos palpites daquele jogo é recalculada.
                </p>
              </div>
              <button
                className="btn-secondary"
                onClick={() =>
                  void runAction(recalculateScores, "Pontuação recalculada.")
                }
              >
                <RefreshCw size={17} />
                Recalcular tudo
              </button>
            </div>
            <div className="grid gap-3">
              {matches.map((match) => (
                <ResultRow
                  key={match.id}
                  match={match}
                  onSave={(scoreA, scoreB) =>
                    runAction(
                      () => saveMatchResult(match.id, scoreA, scoreB),
                      "Resultado salvo.",
                    )
                  }
                />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3">
              <h3 className="text-lg font-black text-emerald-950">Usuários e pontos</h3>
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
        <h3 className="text-lg font-black text-emerald-950">Pedidos de participação</h3>
        <p className="text-sm text-slate-500">
          Aprove quem pode entrar em cada núcleo de amigos.
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

function TeamsManager({
  teams,
  onEdit,
  onDelete,
}: {
  teams: Team[];
  onEdit: (team: Team) => void;
  onDelete: (teamId: string) => Promise<void>;
}) {
  return (
    <section className="surface p-4">
      <h3 className="text-lg font-black text-emerald-950">Seleções cadastradas</h3>
      <div className="mt-4 grid gap-3">
        {teams.map((team) => (
          <div
            key={team.id}
            className="grid gap-3 rounded-md border border-slate-100 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <div>
              <p className="font-black text-slate-950">{team.name}</p>
              <p className="text-sm text-slate-500">Grupo {team.group_name}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" type="button" onClick={() => onEdit(team)}>
                <Edit2 size={17} />
                Editar
              </button>
              <button
                className="btn-secondary text-red-700 hover:border-red-200 hover:text-red-800"
                type="button"
                onClick={() => {
                  if (window.confirm("Remover esta seleção?")) void onDelete(team.id);
                }}
              >
                <Trash2 size={17} />
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MatchesManager({
  matches,
  onEdit,
  onDelete,
}: {
  matches: MatchWithTeams[];
  onEdit: (match: MatchWithTeams) => void;
  onDelete: (matchId: string) => Promise<void>;
}) {
  return (
    <section className="surface p-4">
      <h3 className="text-lg font-black text-emerald-950">Jogos cadastrados</h3>
      <div className="mt-4 grid gap-3">
        {matches.map((match) => (
          <div
            key={match.id}
            className="grid gap-3 rounded-md border border-slate-100 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <div>
              <p className="font-black text-slate-950">
                {match.team_a.name} x {match.team_b.name}
              </p>
              <p className="text-sm text-slate-500">
                {match.stage}
                {match.group_name ? ` · Grupo ${match.group_name}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" type="button" onClick={() => onEdit(match)}>
                <Edit2 size={17} />
                Editar
              </button>
              <button
                className="btn-secondary text-red-700 hover:border-red-200 hover:text-red-800"
                type="button"
                onClick={() => {
                  if (window.confirm("Remover este jogo e seus palpites?")) {
                    void onDelete(match.id);
                  }
                }}
              >
                <Trash2 size={17} />
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TeamForm({
  team,
  onCreate,
  onUpdate,
  onCancel,
}: {
  team: Team | null;
  onCreate: (team: Omit<Team, "id">) => Promise<void>;
  onUpdate: (teamId: string, team: Omit<Team, "id">) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [flagUrl, setFlagUrl] = useState("");

  useEffect(() => {
    setName(team?.name ?? "");
    setGroupName(team?.group_name ?? "");
    setFlagUrl(team?.flag_url ?? "");
  }, [team]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      name,
      group_name: groupName.toUpperCase(),
      flag_url: flagUrl || null,
    };

    if (team) {
      await onUpdate(team.id, payload);
      onCancel();
    } else {
      await onCreate(payload);
    }

    setName("");
    setGroupName("");
    setFlagUrl("");
  }

  return (
    <form className="surface grid min-w-0 gap-3 p-4" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-emerald-950">
          {team ? "Editar seleção" : "Cadastrar seleção"}
        </h3>
        {team ? (
          <button className="btn-secondary px-3 py-1.5" type="button" onClick={onCancel}>
            <X size={16} />
            Cancelar
          </button>
        ) : null}
      </div>
      <input
        className="field"
        placeholder="Nome da seleção"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      <input
        className="field"
        placeholder="Grupo, ex: A"
        value={groupName}
        onChange={(event) => setGroupName(event.target.value)}
        required
      />
      <input
        className="field"
        placeholder="URL da bandeira opcional"
        value={flagUrl}
        onChange={(event) => setFlagUrl(event.target.value)}
      />
      <button className="btn-primary">
        {team ? <Save size={17} /> : <Plus size={17} />}
        {team ? "Salvar seleção" : "Cadastrar seleção"}
      </button>
    </form>
  );
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function MatchForm({
  teams,
  match,
  onCreate,
  onUpdate,
  onCancel,
}: {
  teams: Team[];
  match: MatchWithTeams | null;
  onCreate: (
    match: Omit<Match, "id" | "score_a" | "score_b" | "is_finished">,
  ) => Promise<void>;
  onUpdate: (
    matchId: string,
    match: Omit<Match, "id" | "score_a" | "score_b" | "is_finished">,
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [stage, setStage] = useState("Fase de grupos");
  const [startsAt, setStartsAt] = useState("");

  useEffect(() => {
    setTeamAId(match?.team_a_id ?? "");
    setTeamBId(match?.team_b_id ?? "");
    setGroupName(match?.group_name ?? "");
    setStage(match?.stage ?? "Fase de grupos");
    setStartsAt(match ? toDatetimeLocal(match.starts_at) : "");
  }, [match]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      team_a_id: teamAId || teams[0]?.id || "",
      team_b_id: teamBId || teams[1]?.id || "",
      group_name: groupName || null,
      stage,
      starts_at: new Date(startsAt).toISOString(),
    };

    if (match) {
      await onUpdate(match.id, payload);
      onCancel();
    } else {
      await onCreate(payload);
    }

    setStartsAt("");
  }

  return (
    <form className="surface grid min-w-0 gap-3 p-4" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-emerald-950">
          {match ? "Editar jogo" : "Cadastrar jogo"}
        </h3>
        {match ? (
          <button className="btn-secondary px-3 py-1.5" type="button" onClick={onCancel}>
            <X size={16} />
            Cancelar
          </button>
        ) : null}
      </div>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <TeamSelect value={teamAId} onChange={setTeamAId} teams={teams} label="Time A" />
        <TeamSelect value={teamBId} onChange={setTeamBId} teams={teams} label="Time B" />
      </div>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <input
          className="field"
          placeholder="Grupo opcional"
          value={groupName}
          onChange={(event) => setGroupName(event.target.value.toUpperCase())}
        />
        <select className="field" value={stage} onChange={(event) => setStage(event.target.value)}>
          <option>Fase de grupos</option>
          <option>Oitavas</option>
          <option>Quartas</option>
          <option>Semifinal</option>
          <option>Terceiro lugar</option>
          <option>Final</option>
        </select>
      </div>
      <input
        className="field"
        type="datetime-local"
        value={startsAt}
        onChange={(event) => setStartsAt(event.target.value)}
        required
      />
      <button className="btn-primary">
        {match ? <Save size={17} /> : <Plus size={17} />}
        {match ? "Salvar jogo" : "Cadastrar jogo"}
      </button>
    </form>
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
      <h3 className="text-lg font-black text-emerald-950">Classificados reais</h3>
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
      <h3 className="text-lg font-black text-emerald-950">Pódio real</h3>
      <TeamSelect label="Campeão" teams={teams} value={championId} onChange={setChampionId} />
      <TeamSelect label="Vice" teams={teams} value={runnerUpId} onChange={setRunnerUpId} />
      <TeamSelect
        label="Terceiro"
        teams={teams}
        value={thirdPlaceId}
        onChange={setThirdPlaceId}
      />
      <button className="btn-primary">
        <Save size={17} />
        Salvar pódio real
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
        <p className="text-sm text-slate-500">{match.stage}</p>
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
