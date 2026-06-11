export type Profile = {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  created_at?: string;
};

export type Competition = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at?: string;
};

export type MembershipStatus = "pending" | "approved" | "rejected";

export type PoolMembership = {
  id: string;
  pool_id: string;
  user_id: string;
  status: MembershipStatus;
  requested_at?: string;
  reviewed_at?: string | null;
};

export type PoolMembershipWithProfile = PoolMembership & {
  pool_name?: string;
  user_name?: string;
  user_email?: string;
};

export type Team = {
  id: string;
  name: string;
  group_name: string;
  flag_url: string | null;
};

export type Match = {
  id: string;
  team_a_id: string;
  team_b_id: string;
  group_name: string | null;
  stage: string;
  starts_at: string;
  score_a: number | null;
  score_b: number | null;
  is_finished: boolean;
};

export type MatchPrediction = {
  id: string;
  pool_id: string;
  user_id: string;
  match_id: string;
  predicted_score_a: number;
  predicted_score_b: number;
  points: number;
  created_at?: string;
  updated_at?: string;
};

export type GroupPrediction = {
  id: string;
  pool_id: string;
  user_id: string;
  group_name: string;
  team_id: string;
  position: number;
  points: number;
  locked: boolean;
  created_at?: string;
};

export type FinalPrediction = {
  id: string;
  pool_id: string;
  user_id: string;
  champion_id: string;
  runner_up_id: string;
  third_place_id: string;
  champion_points: number;
  runner_up_points: number;
  third_place_points: number;
  locked: boolean;
  created_at?: string;
};

export type RankingRow = {
  pool_id?: string;
  user_id: string;
  name: string;
  email: string;
  match_points: number;
  group_points: number;
  final_points: number;
  total_points: number;
};

export type MatchWithTeams = Match & {
  team_a: Team;
  team_b: Team;
};

export type ToastKind = "success" | "error" | "info";
