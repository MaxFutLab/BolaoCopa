import { CheckCircle2, Lock } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../lib/auth";
import { usePoolData } from "../lib/usePoolData";

type Choices = Record<string, { first: string; second: string }>;

export function ClassificationPage() {
  const { profile } = useAuth();
  const { teams, groupPredictions, confirmGroupPredictions, loading } = usePoolData(
    profile?.id,
  );
  const [choices, setChoices] = useState<Choices>({});
  const [message, setMessage] = useState("");
  const locked = groupPredictions.length > 0;

  const groups = useMemo(() => {
    return Array.from(new Set(teams.map((team) => team.group_name))).sort();
  }, [teams]);

  useEffect(() => {
    setChoices((current) => {
      const next = { ...current };
      groups.forEach((group) => {
        const groupTeams = teams.filter((team) => team.group_name === group);
        next[group] ??= {
          first: groupTeams[0]?.id ?? "",
          second: groupTeams[1]?.id ?? "",
        };
      });
      return next;
    });
  }, [groups, teams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const payload = groups.flatMap((group) => {
      const choice = choices[group];
      return [
        { group_name: group, team_id: choice.first, position: 1 },
        { group_name: group, team_id: choice.second, position: 2 },
      ];
    });

    const hasDuplicate = groups.some((group) => {
      const choice = choices[group];
      return !choice?.first || !choice?.second || choice.first === choice.second;
    });

    if (hasDuplicate) {
      setMessage("Escolha dois times diferentes por grupo.");
      return;
    }

    try {
      await confirmGroupPredictions(payload);
      setMessage("Classificados confirmados.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel confirmar.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Classificacao"
        title="Classificados por grupo"
        description="Escolha dois classificados por grupo. Depois de confirmar, a edicao fica bloqueada."
      />

      {loading ? (
        <p className="text-sm font-semibold text-slate-500">Carregando grupos...</p>
      ) : locked ? (
        <LockedGroupPredictions teams={teams} predictions={groupPredictions} />
      ) : (
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 lg:grid-cols-2">
            {groups.map((group) => {
              const groupTeams = teams.filter((team) => team.group_name === group);

              return (
                <section className="surface overflow-hidden" key={group}>
                  <div className="bg-slate-950 px-4 py-3 text-white">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-200">
                      Grupo {group}
                    </p>
                    <h3 className="text-lg font-black">Escolha seus classificados</h3>
                  </div>
                  <div className="grid gap-3 p-4 sm:grid-cols-2">
                    <SelectGroupTeam
                      label="1o classificado"
                      value={choices[group]?.first ?? ""}
                      teams={groupTeams}
                      onChange={(value) =>
                        setChoices({
                          ...choices,
                          [group]: { ...choices[group], first: value },
                        })
                      }
                    />
                    <SelectGroupTeam
                      label="2o classificado"
                      value={choices[group]?.second ?? ""}
                      teams={groupTeams}
                      onChange={(value) =>
                        setChoices({
                          ...choices,
                          [group]: { ...choices[group], second: value },
                        })
                      }
                    />
                  </div>
                </section>
              );
            })}
          </div>
          <button className="btn-primary w-full sm:w-auto">
            <CheckCircle2 size={18} />
            Confirmar classificados
          </button>
          {message ? <p className="text-sm font-semibold text-red-700">{message}</p> : null}
        </form>
      )}
    </>
  );
}

function SelectGroupTeam({
  label,
  value,
  teams,
  onChange,
}: {
  label: string;
  value: string;
  teams: { id: string; name: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1">
      <span className="text-sm font-black text-slate-700">{label}</span>
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

function LockedGroupPredictions({
  teams,
  predictions,
}: {
  teams: { id: string; name: string }[];
  predictions: { group_name: string; team_id: string; position: number; points: number }[];
}) {
  return (
    <div className="surface p-4">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-sm font-bold text-white">
        <Lock size={17} />
        Palpite confirmado e bloqueado
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {predictions.map((prediction) => (
          <div
            key={`${prediction.group_name}-${prediction.position}`}
            className="rounded-md border border-slate-100 bg-slate-50 p-3"
          >
            <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-700">
              Grupo {prediction.group_name} - {prediction.position}o
            </p>
            <p className="mt-1 font-black text-slate-950">
              {teams.find((team) => team.id === prediction.team_id)?.name}
            </p>
            <p className="text-sm font-semibold text-slate-500">
              {prediction.points} ponto(s)
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
