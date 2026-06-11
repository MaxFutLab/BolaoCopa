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
      setMessage("Escolha três seleções diferentes.");
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
      setMessage(error instanceof Error ? error.message : "Não foi possível confirmar.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Palpite final"
        title="Campeão, vice e terceiro"
        description="Esse palpite vale 10, 7 e 5 pontos. Depois de confirmado, não pode ser editado."
      />

      {loading ? (
        <p className="text-sm font-semibold text-slate-500">Carregando seleções...</p>
      ) : finalPrediction ? (
        <section className="surface p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
            <Lock size={17} />
            Palpite confirmado e bloqueado
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <PodiumCard
              title="Campeão"
              points={finalPrediction.champion_points}
              team={teams.find((team) => team.id === finalPrediction.champion_id)?.name}
            />
            <PodiumCard
              title="Vice"
              points={finalPrediction.runner_up_points}
              team={teams.find((team) => team.id === finalPrediction.runner_up_id)?.name}
            />
            <PodiumCard
              title="Terceiro"
              points={finalPrediction.third_place_points}
              team={teams.find((team) => team.id === finalPrediction.third_place_id)?.name}
            />
          </div>
        </section>
      ) : (
        <form className="surface grid max-w-3xl gap-4 p-4" onSubmit={handleSubmit}>
          <SelectTeam
            label="Campeão"
            value={championId}
            onChange={setChampionId}
            teams={teams}
          />
          <SelectTeam
            label="Vice-campeão"
            value={runnerUpId}
            onChange={setRunnerUpId}
            teams={teams}
          />
          <SelectTeam
            label="Terceiro lugar"
            value={thirdPlaceId}
            onChange={setThirdPlaceId}
            teams={teams}
          />
          <button className="btn-primary w-full sm:w-auto">
            <CheckCircle2 size={18} />
            Confirmar palpite final
          </button>
          {message ? <p className="text-sm font-semibold text-red-700">{message}</p> : null}
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
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name} · Grupo {team.group_name}
          </option>
        ))}
      </select>
    </label>
  );
}

function PodiumCard({
  title,
  team,
  points,
}: {
  title: string;
  team?: string;
  points: number;
}) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-700">{title}</p>
      <p className="mt-1 text-xl font-black text-emerald-950">{team}</p>
      <p className="text-sm text-slate-500">{points} ponto(s)</p>
    </div>
  );
}
