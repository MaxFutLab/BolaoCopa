import { CheckCircle2, Lock } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../lib/auth";
import { usePoolData } from "../lib/usePoolData";

export function FinalPredictionPage() {
  const { profile } = useAuth();
  const { teams, finalPrediction, confirmFinalPrediction, loading } = usePoolData(
    profile?.id,
  );
  const [championId, setChampionId] = useState("");
  const [runnerUpId, setRunnerUpId] = useState("");
  const [thirdPlaceId, setThirdPlaceId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setChampionId((value) => value || teams[0]?.id || "");
    setRunnerUpId((value) => value || teams[1]?.id || "");
    setThirdPlaceId((value) => value || teams[2]?.id || "");
  }, [teams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const uniqueChoices = new Set([championId, runnerUpId, thirdPlaceId]);
    if (uniqueChoices.size !== 3) {
      setMessage("Escolha tres selecoes diferentes.");
      return;
    }

    try {
      await confirmFinalPrediction({
        champion_id: championId,
        runner_up_id: runnerUpId,
        third_place_id: thirdPlaceId,
      });
      setMessage("Palpite final confirmado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel confirmar.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Palpite final"
        title="Campeao, vice e terceiro"
        description="Esse palpite vale 10, 7 e 5 pontos. Depois de confirmado, nao pode ser editado."
      />

      {loading ? (
        <p className="text-sm font-semibold text-slate-500">Carregando selecoes...</p>
      ) : finalPrediction ? (
        <section className="surface p-4">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-sm font-bold text-white">
            <Lock size={17} />
            Palpite confirmado e bloqueado
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <PodiumCard
              rank="01"
              title="Campeao"
              points={finalPrediction.champion_points}
              team={teams.find((team) => team.id === finalPrediction.champion_id)?.name}
            />
            <PodiumCard
              rank="02"
              title="Vice"
              points={finalPrediction.runner_up_points}
              team={teams.find((team) => team.id === finalPrediction.runner_up_id)?.name}
            />
            <PodiumCard
              rank="03"
              title="Terceiro"
              points={finalPrediction.third_place_points}
              team={teams.find((team) => team.id === finalPrediction.third_place_id)?.name}
            />
          </div>
        </section>
      ) : (
        <form className="surface tech-panel grid max-w-3xl gap-4 p-4 sm:p-5" onSubmit={handleSubmit}>
          <div className="relative grid gap-4">
            <SelectTeam label="Campeao" value={championId} onChange={setChampionId} teams={teams} />
            <SelectTeam label="Vice-campeao" value={runnerUpId} onChange={setRunnerUpId} teams={teams} />
            <SelectTeam label="Terceiro lugar" value={thirdPlaceId} onChange={setThirdPlaceId} teams={teams} />
            <button className="btn-primary w-full sm:w-auto">
              <CheckCircle2 size={18} />
              Confirmar palpite final
            </button>
            {message ? <p className="text-sm font-semibold text-red-700">{message}</p> : null}
          </div>
        </form>
      )}
    </>
  );
}

function SelectTeam({
  label,
  value,
  onChange,
  teams,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  teams: { id: string; name: string; group_name: string }[];
}) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name} - Grupo {team.group_name}
          </option>
        ))}
      </select>
    </label>
  );
}

function PodiumCard({
  rank,
  title,
  team,
  points,
}: {
  rank: string;
  title: string;
  team?: string;
  points: number;
}) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-4">
      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-black text-sky-800">
        {rank}
      </span>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {title}
      </p>
      <p className="mt-1 break-words text-xl font-black text-slate-950">{team}</p>
      <p className="text-sm font-semibold text-slate-500">{points} ponto(s)</p>
    </div>
  );
}
