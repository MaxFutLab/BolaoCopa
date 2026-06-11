import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Profile } from "../types";
import { demoProfile } from "./mockData";
import { isSupabaseConfigured, supabase } from "./supabase";

type AuthContextValue = {
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    name: string,
    email: string,
    password: string,
  ) => Promise<"check-email" | "signed-in">;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const mockSessionKey = "bolao.demoProfile";

async function fetchProfile(userId: string, email: string): Promise<Profile> {
  if (!supabase) return demoProfile;

  const { data, error } = await supabase
    .from("users_profile")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return {
      id: userId,
      name: email.split("@")[0],
      email,
      is_admin: false,
    };
  }

  return data as Profile;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      if (!isSupabaseConfigured || !supabase) {
        const stored = localStorage.getItem(mockSessionKey);
        setProfile(stored ? (JSON.parse(stored) as Profile) : null);
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (mounted && user) {
        setProfile(await fetchProfile(user.id, user.email ?? ""));
      }

      if (mounted) setLoading(false);
    }

    loadSession();

    if (!supabase) return undefined;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user;
      setProfile(user ? await fetchProfile(user.id, user.email ?? "") : null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      loading,
      async signIn(email, password) {
        if (!isSupabaseConfigured || !supabase) {
          const nextProfile = {
            ...demoProfile,
            email,
            name: email.split("@")[0] || demoProfile.name,
          };
          localStorage.setItem(mockSessionKey, JSON.stringify(nextProfile));
          setProfile(nextProfile);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      },
      async signUp(name, email, password) {
        if (!isSupabaseConfigured || !supabase) {
          const nextProfile = { ...demoProfile, name, email };
          localStorage.setItem(mockSessionKey, JSON.stringify(nextProfile));
          setProfile(nextProfile);
          return "signed-in";
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: `${window.location.origin}/login?confirmed=1`,
          },
        });
        if (error) throw error;
        return data.session ? "signed-in" : "check-email";
      },
      async resetPassword(email) {
        if (!isSupabaseConfigured || !supabase) return;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
      },
      async updatePassword(password) {
        if (!isSupabaseConfigured || !supabase) return;

        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      },
      async signOut() {
        if (supabase) await supabase.auth.signOut();
        localStorage.removeItem(mockSessionKey);
        setProfile(null);
      },
    }),
    [loading, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth precisa estar dentro de AuthProvider");
  }
  return context;
}
