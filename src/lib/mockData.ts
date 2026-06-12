import type {
  Competition,
  FinalPrediction,
  GroupPrediction,
  Match,
  MatchPrediction,
  PoolMembership,
  PoolMembershipWithProfile,
  Profile,
  RankingRow,
  Team,
} from "../types";
import { calculateMatchPoints, updateRankingRealtime } from "./scoring";

export const defaultPoolId = "resenha-sem-regras";

export const demoProfile: Profile = {
  id: "demo-user",
  name: "Jogador Demo",
  email: "demo@bolao.local",
  is_admin: true,
  created_at: new Date().toISOString(),
};

export const mockProfiles: Profile[] = [
  demoProfile,
  {
    id: "ana",
    name: "Ana",
    email: "ana@bolao.local",
    is_admin: false,
  },
  {
    id: "bruno",
    name: "Bruno",
    email: "bruno@bolao.local",
    is_admin: false,
  },
];

export const mockCompetitions: Competition[] = [
  {
    id: defaultPoolId,
    name: "Resenha sem regras",
    description: "Bolão principal da turma.",
    is_active: true,
  },
  {
    id: "amigos-de-papinha",
    name: "Amigos de papinha",
    description: "Núcleo paralelo para outra roda de amigos.",
    is_active: true,
  },
  {
    id: "comunidade-top-eleven-brasil",
    name: "Comunidade Top Eleven Brasil",
    description: "Bolao da comunidade Top Eleven Brasil.",
    is_active: true,
  },
];

export const mockMemberships: PoolMembership[] = [
  {
    id: "member-demo-resenha",
    pool_id: defaultPoolId,
    user_id: "demo-user",
    status: "approved",
  },
  {
    id: "member-demo-papinha",
    pool_id: "amigos-de-papinha",
    user_id: "demo-user",
    status: "approved",
  },
  {
    id: "member-ana-resenha",
    pool_id: defaultPoolId,
    user_id: "ana",
    status: "approved",
  },
  {
    id: "member-bruno-papinha",
    pool_id: "amigos-de-papinha",
    user_id: "bruno",
    status: "pending",
  },
];

export const mockTeams: Team[] = [
  { id: "bra", name: "Brasil", group_name: "A", flag_url: null },
  { id: "ger", name: "Alemanha", group_name: "A", flag_url: null },
  { id: "jpn", name: "Japão", group_name: "A", flag_url: null },
  { id: "mar", name: "Marrocos", group_name: "A", flag_url: null },
  { id: "arg", name: "Argentina", group_name: "B", flag_url: null },
  { id: "fra", name: "França", group_name: "B", flag_url: null },
  { id: "usa", name: "Estados Unidos", group_name: "B", flag_url: null },
  { id: "sen", name: "Senegal", group_name: "B", flag_url: null },
];

const hoursFromNow = (hours: number) =>
  new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

export const mockMatches: Match[] = [
  {
    id: "m1",
    team_a_id: "bra",
    team_b_id: "ger",
    group_name: "A",
    stage: "Fase de grupos",
    starts_at: hoursFromNow(36),
    score_a: null,
    score_b: null,
    is_finished: false,
  },
  {
    id: "m2",
    team_a_id: "jpn",
    team_b_id: "mar",
    group_name: "A",
    stage: "Fase de grupos",
    starts_at: hoursFromNow(58),
    score_a: null,
    score_b: null,
    is_finished: false,
  },
  {
    id: "m3",
    team_a_id: "arg",
    team_b_id: "fra",
    group_name: "B",
    stage: "Fase de grupos",
    starts_at: hoursFromNow(80),
    score_a: null,
    score_b: null,
    is_finished: false,
  },
  {
    id: "m4",
    team_a_id: "usa",
    team_b_id: "sen",
    group_name: "B",
    stage: "Fase de grupos",
    starts_at: hoursFromNow(-12),
    score_a: 1,
    score_b: 1,
    is_finished: true,
  },
];

export const mockMatchPredictions: MatchPrediction[] = [
  {
    id: "p-ana-m4",
    pool_id: defaultPoolId,
    user_id: "ana",
    match_id: "m4",
    predicted_score_a: 1,
    predicted_score_b: 1,
    points: 3,
  },
  {
    id: "p-bruno-m4",
    pool_id: "amigos-de-papinha",
    user_id: "bruno",
    match_id: "m4",
    predicted_score_a: 2,
    predicted_score_b: 1,
    points: 0,
  },
];

const competitionsKey = "bolao.competitions";
const membershipsKey = "bolao.memberships";
const matchPredictionsKey = "bolao.matchPredictions";
const groupPredictionsKey = "bolao.groupPredictions";
const finalPredictionKey = "bolao.finalPrediction";
const teamsKey = "bolao.teams";
const matchesKey = "bolao.matches";

function readStorage<T>(key: string, fallback: T): T {
  const value = localStorage.getItem(key);
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getMockTeams(): Team[] {
  return readStorage(teamsKey, mockTeams);
}

export function setMockTeams(teams: Team[]) {
  writeStorage(teamsKey, teams);
}

export function getMockMatches(): Match[] {
  return readStorage(matchesKey, mockMatches);
}

export function setMockMatches(matches: Match[]) {
  writeStorage(matchesKey, matches);
}

export function getMockCompetitions(): Competition[] {
  const stored = readStorage(competitionsKey, mockCompetitions);
  const merged = [
    ...stored,
    ...mockCompetitions.filter(
      (competition) => !stored.some((item) => item.id === competition.id),
    ),
  ];

  if (merged.length !== stored.length) writeStorage(competitionsKey, merged);
  return merged;
}

export function getMockMemberships(userId?: string): PoolMembershipWithProfile[] {
  const competitions = getMockCompetitions();
  const all = readStorage<PoolMembership[]>(membershipsKey, mockMemberships);
  return all
    .filter((item) => !userId || item.user_id === userId)
    .map((item) => {
      const profile = mockProfiles.find((profileItem) => profileItem.id === item.user_id);
      const competition = competitions.find(
        (competitionItem) => competitionItem.id === item.pool_id,
      );
      return {
        ...item,
        pool_name: competition?.name,
        user_name: profile?.name,
        user_email: profile?.email,
      };
    });
}

export function requestMockMembership(userId: string, poolId: string) {
  const all = readStorage<PoolMembership[]>(membershipsKey, mockMemberships);
  const existing = all.find(
    (item) => item.user_id === userId && item.pool_id === poolId,
  );

  if (existing) {
    if (existing.status === "rejected") {
      writeStorage(
        membershipsKey,
        all.map((item) =>
          item.id === existing.id
            ? {
                ...item,
                status: "pending",
                requested_at: new Date().toISOString(),
                reviewed_at: null,
              }
            : item,
        ),
      );
    }
    return;
  }

  writeStorage(membershipsKey, [
    ...all,
    {
      id: crypto.randomUUID(),
      pool_id: poolId,
      user_id: userId,
      status: "pending",
      requested_at: new Date().toISOString(),
    },
  ]);
}

export function updateMockMembershipStatus(
  membershipId: string,
  status: PoolMembership["status"],
) {
  const all = readStorage<PoolMembership[]>(membershipsKey, mockMemberships);
  writeStorage(
    membershipsKey,
    all.map((item) =>
      item.id === membershipId
        ? { ...item, status, reviewed_at: new Date().toISOString() }
        : item,
    ),
  );
}

function withPoolId<T extends { pool_id?: string }>(items: T[]): Array<T & { pool_id: string }> {
  return items.map((item) => ({ ...item, pool_id: item.pool_id ?? defaultPoolId }));
}

export function getMockMatchPredictions(
  userId?: string,
  poolId = defaultPoolId,
): MatchPrediction[] {
  const all = withPoolId(readStorage(matchPredictionsKey, mockMatchPredictions));
  return all.filter(
    (item) => item.pool_id === poolId && (!userId || item.user_id === userId),
  );
}

export function setMockMatchPrediction(prediction: MatchPrediction) {
  const all = withPoolId(readStorage(matchPredictionsKey, mockMatchPredictions));
  const next = [
    ...all.filter(
      (item) =>
        !(
          item.pool_id === prediction.pool_id &&
          item.user_id === prediction.user_id &&
          item.match_id === prediction.match_id
        ),
    ),
    prediction,
  ];
  writeStorage(matchPredictionsKey, next);
}

export function getMockGroupPredictions(
  userId: string,
  poolId = defaultPoolId,
): GroupPrediction[] {
  return withPoolId(readStorage<GroupPrediction[]>(groupPredictionsKey, [])).filter(
    (item) => item.user_id === userId && item.pool_id === poolId,
  );
}

export function setMockGroupPredictions(predictions: GroupPrediction[]) {
  const all = withPoolId(readStorage<GroupPrediction[]>(groupPredictionsKey, []));
  const userId = predictions[0]?.user_id;
  const poolId = predictions[0]?.pool_id;
  const next = [
    ...all.filter((item) => item.user_id !== userId || item.pool_id !== poolId),
    ...predictions,
  ];
  writeStorage(groupPredictionsKey, next);
}

export function getMockFinalPrediction(
  userId: string,
  poolId = defaultPoolId,
): FinalPrediction | null {
  const all = withPoolId(readStorage<FinalPrediction[]>(finalPredictionKey, []));
  return all.find((item) => item.user_id === userId && item.pool_id === poolId) ?? null;
}

export function setMockFinalPrediction(prediction: FinalPrediction) {
  const all = withPoolId(readStorage<FinalPrediction[]>(finalPredictionKey, []));
  const next = [
    ...all.filter(
      (item) =>
        item.user_id !== prediction.user_id || item.pool_id !== prediction.pool_id,
    ),
    prediction,
  ];
  writeStorage(finalPredictionKey, next);
}

export function getMockRanking(poolId = defaultPoolId): RankingRow[] {
  const matches = getMockMatches();
  const approvedUserIds = getMockMemberships()
    .filter((item) => item.pool_id === poolId && item.status === "approved")
    .map((item) => item.user_id);
  const predictions = getMockMatchPredictions(undefined, poolId).map((prediction) => {
    const match = matches.find((item) => item.id === prediction.match_id);
    return match
      ? { ...prediction, points: calculateMatchPoints(prediction, match) }
      : prediction;
  });
  const groupPredictions = withPoolId(
    readStorage<GroupPrediction[]>(groupPredictionsKey, []),
  ).filter((item) => item.pool_id === poolId);
  const finalPredictions = withPoolId(
    readStorage<FinalPrediction[]>(finalPredictionKey, []),
  ).filter((item) => item.pool_id === poolId);

  return updateRankingRealtime(
    mockProfiles.filter((profile) => approvedUserIds.includes(profile.id)).map((profile) => {
      const matchPoints = predictions
        .filter((item) => item.user_id === profile.id)
        .reduce((total, item) => total + item.points, 0);
      const groupPoints = groupPredictions
        .filter((item) => item.user_id === profile.id)
        .reduce((total, item) => total + item.points, 0);
      const finalPoints = finalPredictions
        .filter((item) => item.user_id === profile.id)
        .reduce(
          (total, item) =>
            total +
            item.champion_points +
            item.runner_up_points +
            item.third_place_points,
          0,
        );

      return {
        pool_id: poolId,
        user_id: profile.id,
        name: profile.name,
        email: profile.email,
        match_points: matchPoints,
        group_points: groupPoints,
        final_points: finalPoints,
        total_points: matchPoints + groupPoints + finalPoints,
      };
    }),
  );
}
