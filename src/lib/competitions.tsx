import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  Competition,
  MembershipStatus,
  PoolMembershipWithProfile,
} from "../types";
import { useAuth } from "./auth";
import {
  getMockCompetitions,
  getMockMemberships,
  requestMockMembership,
  updateMockMembershipStatus,
} from "./mockData";
import { isSupabaseConfigured, supabase } from "./supabase";

type CompetitionContextValue = {
  competitions: Competition[];
  memberships: PoolMembershipWithProfile[];
  approvedCompetitions: Competition[];
  pendingMemberships: PoolMembershipWithProfile[];
  selectedCompetition: Competition | null;
  selectedCompetitionId: string | null;
  loading: boolean;
  selectCompetition: (poolId: string) => void;
  requestMembership: (poolId: string) => Promise<void>;
  updateMembershipStatus: (
    membershipId: string,
    status: MembershipStatus,
  ) => Promise<void>;
  refreshCompetitions: () => Promise<void>;
};

const CompetitionContext = createContext<CompetitionContextValue | null>(null);
const selectedPoolKey = "bolao.selectedPoolId";

function normalizeMemberships(rows: unknown[]): PoolMembershipWithProfile[] {
  return rows.map((row) => {
    const item = row as PoolMembershipWithProfile & {
      pool_competitions?: { name?: string };
      users_profile?: { name?: string; email?: string };
    };

    return {
      ...item,
      pool_name: item.pool_name ?? item.pool_competitions?.name,
      user_name: item.user_name ?? item.users_profile?.name,
      user_email: item.user_email ?? item.users_profile?.email,
    };
  });
}

export function CompetitionProvider({ children }: PropsWithChildren) {
  const { profile } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [memberships, setMemberships] = useState<PoolMembershipWithProfile[]>([]);
  const [pendingMemberships, setPendingMemberships] = useState<
    PoolMembershipWithProfile[]
  >([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(
    localStorage.getItem(selectedPoolKey),
  );
  const [loading, setLoading] = useState(true);

  const refreshCompetitions = useCallback(async () => {
    if (!profile) {
      setCompetitions([]);
      setMemberships([]);
      setPendingMemberships([]);
      setSelectedCompetitionId(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (!isSupabaseConfigured || !supabase) {
      const nextCompetitions = getMockCompetitions();
      const nextMemberships = getMockMemberships(profile.id);
      setCompetitions(nextCompetitions);
      setMemberships(nextMemberships);
      setPendingMemberships(
        profile.is_admin
          ? getMockMemberships().filter((item) => item.status === "pending")
          : [],
      );
      setLoading(false);
      return;
    }

    const membershipsQuery = supabase
      .from("pool_memberships")
      .select(
        "*, pool_competitions(name), users_profile(name,email)",
      )
      .eq("user_id", profile.id);

    const [competitionsResult, membershipsResult, pendingResult] = await Promise.all([
      supabase
        .from("pool_competitions")
        .select("*")
        .eq("is_active", true)
        .order("name"),
      membershipsQuery,
      profile.is_admin
        ? supabase
            .from("pool_memberships")
            .select("*, pool_competitions(name), users_profile(name,email)")
            .eq("status", "pending")
            .order("requested_at")
        : Promise.resolve({ data: [] }),
    ]);

    setCompetitions((competitionsResult.data ?? []) as Competition[]);
    setMemberships(normalizeMemberships(membershipsResult.data ?? []));
    setPendingMemberships(normalizeMemberships(pendingResult.data ?? []));
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    void refreshCompetitions();
  }, [refreshCompetitions]);

  useEffect(() => {
    if (!supabase || !profile) return undefined;
    const client = supabase;

    const channel = client
      .channel("competitions-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pool_memberships" },
        refreshCompetitions,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pool_competitions" },
        refreshCompetitions,
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [profile, refreshCompetitions]);

  const approvedCompetitions = useMemo(() => {
    const approvedIds = memberships
      .filter((item) => item.status === "approved")
      .map((item) => item.pool_id);
    return competitions.filter((competition) => approvedIds.includes(competition.id));
  }, [competitions, memberships]);

  useEffect(() => {
    if (loading) return;
    if (approvedCompetitions.length === 0) {
      setSelectedCompetitionId(null);
      localStorage.removeItem(selectedPoolKey);
      return;
    }

    const isSelectedApproved = approvedCompetitions.some(
      (competition) => competition.id === selectedCompetitionId,
    );

    if (!isSelectedApproved) {
      const nextId = approvedCompetitions[0].id;
      setSelectedCompetitionId(nextId);
      localStorage.setItem(selectedPoolKey, nextId);
    }
  }, [approvedCompetitions, loading, selectedCompetitionId]);

  const selectedCompetition =
    approvedCompetitions.find((item) => item.id === selectedCompetitionId) ?? null;

  const value = useMemo<CompetitionContextValue>(
    () => ({
      competitions,
      memberships,
      approvedCompetitions,
      pendingMemberships,
      selectedCompetition,
      selectedCompetitionId: selectedCompetition?.id ?? null,
      loading,
      selectCompetition(poolId) {
        setSelectedCompetitionId(poolId);
        localStorage.setItem(selectedPoolKey, poolId);
      },
      async requestMembership(poolId) {
        if (!profile) return;

        if (!supabase) {
          requestMockMembership(profile.id, poolId);
          await refreshCompetitions();
          return;
        }

        const existing = memberships.find((item) => item.pool_id === poolId);
        const payload = {
          pool_id: poolId,
          user_id: profile.id,
          status: "pending",
          requested_at: new Date().toISOString(),
          reviewed_at: null,
        };

        const { error } = existing
          ? await supabase
              .from("pool_memberships")
              .update(payload)
              .eq("id", existing.id)
          : await supabase.from("pool_memberships").insert(payload);

        if (error) throw error;
        await refreshCompetitions();
      },
      async updateMembershipStatus(membershipId, status) {
        if (!profile?.is_admin) return;

        if (!supabase) {
          updateMockMembershipStatus(membershipId, status);
          await refreshCompetitions();
          return;
        }

        const { error } = await supabase
          .from("pool_memberships")
          .update({ status, reviewed_at: new Date().toISOString() })
          .eq("id", membershipId);

        if (error) throw error;
        await refreshCompetitions();
      },
      refreshCompetitions,
    }),
    [
      approvedCompetitions,
      competitions,
      loading,
      memberships,
      pendingMemberships,
      profile,
      refreshCompetitions,
      selectedCompetition,
    ],
  );

  return (
    <CompetitionContext.Provider value={value}>
      {children}
    </CompetitionContext.Provider>
  );
}

export function useCompetition() {
  const context = useContext(CompetitionContext);
  if (!context) {
    throw new Error("useCompetition precisa estar dentro de CompetitionProvider");
  }
  return context;
}
