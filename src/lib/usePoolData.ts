import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  FinalPrediction,
  GroupPrediction,
  Match,
  MatchPrediction,
  MatchWithTeams,
  RankingRow,
  Team,
} from "../types";
import {
  getMockFinalPrediction,
  getMockGroupPredictions,
  getMockMatches,
  getMockMatchPredictions,
  getMockRanking,
  getMockTeams,
  setMockFinalPrediction,
  setMockGroupPredictions,
  setMockMatches,
  setMockMatchPrediction,
  setMockTeams,
} from "./mockData";
import { calculateMatchPoints, canEditMatchPrediction } from "./scoring";
import { isSupabaseConfigured, supabase } from "./supabase";
import { useCompetition } from "./competitions";

type SaveMatchPredictionInput = {
  match: Match;
  predicted_score_a: number;
  predicted_score_b: number;
};

export function usePoolData(userId?: string) {
  const { selectedCompetitionId } = useCompetition();
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchPredictions, setMatchPredictions] = useState<MatchPrediction[]>([]);
  const [groupPredictions, setGroupPredictions] = useState<GroupPrediction[]>([]);
  const [finalPrediction, setFinalPrediction] = useState<FinalPrediction | null>(
    null,
  );
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId || !selectedCompetitionId) {
      setTeams([]);
      setMatches([]);
      setMatchPredictions([]);
      setGroupPredictions([]);
      setFinalPrediction(null);
      setRanking([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    if (!isSupabaseConfigured || !supabase) {
      setTeams(getMockTeams());
      setMatches(getMockMatches());
      setMatchPredictions(getMockMatchPredictions(userId, selectedCompetitionId));
      setGroupPredictions(getMockGroupPredictions(userId, selectedCompetitionId));
      setFinalPrediction(getMockFinalPrediction(userId, selectedCompetitionId));
      setRanking(getMockRanking(selectedCompetitionId));
      setLoading(false);
      return;
    }

    const [
      teamsResult,
      matchesResult,
      matchPredictionsResult,
      groupPredictionsResult,
      finalPredictionResult,
      rankingResult,
    ] = await Promise.all([
      supabase.from("teams").select("*").order("group_name").order("name"),
      supabase.from("matches").select("*").order("starts_at"),
      supabase
        .from("match_predictions")
        .select("*")
        .eq("user_id", userId)
        .eq("pool_id", selectedCompetitionId)
        .order("created_at"),
      supabase
        .from("group_predictions")
        .select("*")
        .eq("user_id", userId)
        .eq("pool_id", selectedCompetitionId)
        .order("group_name")
        .order("position"),
      supabase
        .from("final_predictions")
        .select("*")
        .eq("user_id", userId)
        .eq("pool_id", selectedCompetitionId)
        .maybeSingle(),
      supabase
        .from("ranking")
        .select("*")
        .eq("pool_id", selectedCompetitionId)
        .order("total_points", { ascending: false }),
    ]);

    setTeams((teamsResult.data ?? []) as Team[]);
    setMatches((matchesResult.data ?? []) as Match[]);
    setMatchPredictions((matchPredictionsResult.data ?? []) as MatchPrediction[]);
    setGroupPredictions((groupPredictionsResult.data ?? []) as GroupPrediction[]);
    setFinalPrediction((finalPredictionResult.data ?? null) as FinalPrediction | null);
    setRanking((rankingResult.data ?? []) as RankingRow[]);
    setLoading(false);
  }, [selectedCompetitionId, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!supabase || !userId || !selectedCompetitionId) return undefined;
    const client = supabase;

    const channel = client
      .channel("bolao-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_predictions" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_predictions" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "final_predictions" },
        refresh,
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [refresh, selectedCompetitionId, userId]);

  const matchesWithTeams = useMemo<MatchWithTeams[]>(() => {
    return matches
      .map((match) => {
        const teamA = teams.find((team) => team.id === match.team_a_id);
        const teamB = teams.find((team) => team.id === match.team_b_id);
        if (!teamA || !teamB) return null;
        return { ...match, team_a: teamA, team_b: teamB };
      })
      .filter(Boolean) as MatchWithTeams[];
  }, [matches, teams]);

  async function saveMatchPrediction(input: SaveMatchPredictionInput) {
    if (!userId) return;
    if (!selectedCompetitionId) {
      throw new Error("Selecione um bolão antes de salvar palpites.");
    }
    const poolId = selectedCompetitionId;
    if (!canEditMatchPrediction(input.match.starts_at)) {
      throw new Error("Este jogo já está bloqueado para edição.");
    }

    const prediction = {
      pool_id: poolId,
      user_id: userId,
      match_id: input.match.id,
      predicted_score_a: input.predicted_score_a,
      predicted_score_b: input.predicted_score_b,
      points: calculateMatchPoints(input, input.match),
      updated_at: new Date().toISOString(),
    };

    if (!supabase) {
      setMockMatchPrediction({
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...prediction,
      });
      await refresh();
      return;
    }

    const { error } = await supabase.from("match_predictions").upsert(
      prediction,
      { onConflict: "pool_id,user_id,match_id" },
    );
    if (error) throw error;
    await refresh();
  }

  async function confirmGroupPredictions(
    choices: Array<{ group_name: string; team_id: string; position: number }>,
  ) {
    if (!userId) return;
    if (!selectedCompetitionId) {
      throw new Error("Selecione um bolão antes de confirmar classificados.");
    }
    const poolId = selectedCompetitionId;
    if (groupPredictions.length > 0) {
      throw new Error("Os classificados já foram confirmados.");
    }

    const payload = choices.map((choice) => ({
      id: crypto.randomUUID(),
      pool_id: poolId,
      user_id: userId,
      group_name: choice.group_name,
      team_id: choice.team_id,
      position: choice.position,
      points: 0,
      locked: true,
      created_at: new Date().toISOString(),
    }));

    if (!supabase) {
      setMockGroupPredictions(payload);
      await refresh();
      return;
    }

    const { error } = await supabase.from("group_predictions").insert(payload);
    if (error) throw error;
    await refresh();
  }

  async function confirmFinalPrediction(choice: {
    champion_id: string;
    runner_up_id: string;
    third_place_id: string;
  }) {
    if (!userId) return;
    if (!selectedCompetitionId) {
      throw new Error("Selecione um bolão antes de confirmar o palpite final.");
    }
    const poolId = selectedCompetitionId;
    if (finalPrediction) {
      throw new Error("O palpite final já foi confirmado.");
    }

    const payload = {
      id: crypto.randomUUID(),
      pool_id: poolId,
      user_id: userId,
      ...choice,
      champion_points: 0,
      runner_up_points: 0,
      third_place_points: 0,
      locked: true,
      created_at: new Date().toISOString(),
    };

    if (!supabase) {
      setMockFinalPrediction(payload);
      await refresh();
      return;
    }

    const { error } = await supabase.from("final_predictions").insert(payload);
    if (error) throw error;
    await refresh();
  }

  async function saveMatchResult(matchId: string, scoreA: number, scoreB: number) {
    const match = matches.find((item) => item.id === matchId);
    if (!match) return;

    if (!supabase) {
      setMockMatches(
        matches.map((item) =>
          item.id === matchId
            ? { ...item, score_a: scoreA, score_b: scoreB, is_finished: true }
            : item,
        ),
      );
      await refresh();
      return;
    }

    const { error } = await supabase
      .from("matches")
      .update({ score_a: scoreA, score_b: scoreB, is_finished: true })
      .eq("id", matchId);
    if (error) throw error;
    await supabase.rpc("recalculate_match_points", { target_match_id: matchId });
    await refresh();
  }

  async function createTeam(team: Omit<Team, "id">) {
    const payload = { id: crypto.randomUUID(), ...team };

    if (!supabase) {
      setMockTeams([...teams, payload]);
      await refresh();
      return;
    }

    const { error } = await supabase.from("teams").insert(payload);
    if (error) throw error;
    await refresh();
  }

  async function updateTeam(teamId: string, team: Omit<Team, "id">) {
    if (!supabase) {
      setMockTeams(
        teams.map((item) => (item.id === teamId ? { ...item, ...team } : item)),
      );
      await refresh();
      return;
    }

    const { error } = await supabase
      .from("teams")
      .update(team)
      .eq("id", teamId);
    if (error) throw error;
    await refresh();
  }

  async function deleteTeam(teamId: string) {
    const isUsedInMatch = matches.some(
      (match) => match.team_a_id === teamId || match.team_b_id === teamId,
    );

    if (!supabase && isUsedInMatch) {
      throw new Error("Remova ou edite os jogos desse time antes de apagar.");
    }

    if (!supabase) {
      setMockTeams(teams.filter((team) => team.id !== teamId));
      await refresh();
      return;
    }

    const { error } = await supabase.from("teams").delete().eq("id", teamId);
    if (error) throw error;
    await refresh();
  }

  async function createMatch(match: Omit<Match, "id" | "score_a" | "score_b" | "is_finished">) {
    const payload: Match = {
      id: crypto.randomUUID(),
      ...match,
      score_a: null,
      score_b: null,
      is_finished: false,
    };

    if (!supabase) {
      setMockMatches([...matches, payload]);
      await refresh();
      return;
    }

    const { error } = await supabase.from("matches").insert(payload);
    if (error) throw error;
    await refresh();
  }

  async function updateMatch(
    matchId: string,
    match: Omit<Match, "id" | "score_a" | "score_b" | "is_finished">,
  ) {
    if (!supabase) {
      setMockMatches(
        matches.map((item) => (item.id === matchId ? { ...item, ...match } : item)),
      );
      await refresh();
      return;
    }

    const { error } = await supabase
      .from("matches")
      .update(match)
      .eq("id", matchId);
    if (error) throw error;
    await refresh();
  }

  async function deleteMatch(matchId: string) {
    if (!supabase) {
      setMockMatches(matches.filter((match) => match.id !== matchId));
      await refresh();
      return;
    }

    const { error } = await supabase.from("matches").delete().eq("id", matchId);
    if (error) throw error;
    await refresh();
  }

  async function recalculateScores() {
    if (supabase) {
      const { error } = await supabase.rpc("recalculate_all_points");
      if (error) throw error;
    }
    await refresh();
  }

  async function saveRealGroupClassified(value: Record<string, string[]>) {
    if (supabase) {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "real_group_classified", value });
      if (error) throw error;
      await supabase.rpc("recalculate_all_points");
    }
    await refresh();
  }

  async function saveRealPodium(value: {
    champion_id: string;
    runner_up_id: string;
    third_place_id: string;
  }) {
    if (supabase) {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "real_podium", value });
      if (error) throw error;
      await supabase.rpc("recalculate_all_points");
    }
    await refresh();
  }

  return {
    teams,
    matches: matchesWithTeams,
    rawMatches: matches,
    matchPredictions,
    groupPredictions,
    finalPrediction,
    ranking,
    loading,
    refresh,
    saveMatchPrediction,
    confirmGroupPredictions,
    confirmFinalPrediction,
    saveMatchResult,
    createTeam,
    updateTeam,
    deleteTeam,
    createMatch,
    updateMatch,
    deleteMatch,
    recalculateScores,
    saveRealGroupClassified,
    saveRealPodium,
  };
}
