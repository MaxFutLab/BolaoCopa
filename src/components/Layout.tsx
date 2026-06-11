import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Home,
  ListChecks,
  LogOut,
  Medal,
  Send,
  Shield,
  Trophy,
} from "lucide-react";
import type { PropsWithChildren } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useCompetition } from "../lib/competitions";

const navItems = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/palpites", label: "Jogos", icon: CalendarDays },
  { to: "/classificacao", label: "Classificação", icon: ListChecks },
  { to: "/final", label: "Final", icon: Trophy },
  { to: "/ranking", label: "Ranking", icon: Medal },
  { to: "/admin", label: "Admin", icon: Shield, admin: true },
];

export function Layout({ children }: PropsWithChildren) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const {
    competitions,
    memberships,
    approvedCompetitions,
    selectedCompetition,
    selectedCompetitionId,
    loading,
    selectCompetition,
    requestMembership,
  } = useCompetition();
  const hasApprovedCompetition = approvedCompetitions.length > 0;
  const canRenderWithoutCompetition = profile?.is_admin && location.pathname === "/admin";

  return (
    <div className="min-h-screen bg-[#f7f9f5]">
      <header className="border-b border-emerald-900/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
                Copa do Mundo 2026
              </p>
              <h1 className="text-2xl font-black text-emerald-950">
                Bolão entre amigos
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {hasApprovedCompetition ? (
                <label className="hidden min-w-[220px] gap-1 sm:grid">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Bolão atual
                  </span>
                  <select
                    className="field py-1.5"
                    value={selectedCompetitionId ?? ""}
                    onChange={(event) => selectCompetition(event.target.value)}
                  >
                    {approvedCompetitions.map((competition) => (
                      <option key={competition.id} value={competition.id}>
                        {competition.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold text-slate-900">{profile?.name}</p>
                <p className="text-xs text-slate-500">{profile?.email}</p>
              </div>
              <button
                className="btn-secondary px-3"
                onClick={() => void signOut()}
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {hasApprovedCompetition ? (
            <label className="grid gap-1 sm:hidden">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Bolão atual
              </span>
              <select
                className="field"
                value={selectedCompetitionId ?? ""}
                onChange={(event) => selectCompetition(event.target.value)}
              >
                {approvedCompetitions.map((competition) => (
                  <option key={competition.id} value={competition.id}>
                    {competition.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {profile ? (
            <CompetitionRequestBar
              competitions={competitions}
              memberships={memberships}
              onRequest={requestMembership}
            />
          ) : null}

          <div className="w-full min-w-0 max-w-full overflow-hidden">
            <nav className="flex w-full min-w-0 max-w-full gap-2 overflow-x-auto pb-1">
              {navItems
                .filter((item) => !item.admin || profile?.is_admin)
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition",
                        isActive
                          ? "bg-emerald-800 text-white"
                          : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800",
                      ].join(" ")
                    }
                  >
                    <item.icon size={17} />
                    {item.label}
                  </NavLink>
                ))}
            </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <p className="text-sm font-semibold text-slate-500">Carregando bolões...</p>
        ) : selectedCompetition || canRenderWithoutCompetition ? (
          children
        ) : (
          <CompetitionAccessPanel
            competitions={competitions}
            memberships={memberships}
            onRequest={requestMembership}
          />
        )}
      </main>
    </div>
  );
}

function CompetitionRequestBar({
  competitions,
  memberships,
  onRequest,
}: {
  competitions: Array<{ id: string; name: string }>;
  memberships: Array<{ pool_id: string; status: string }>;
  onRequest: (poolId: string) => Promise<void>;
}) {
  const available = competitions.filter((competition) => {
    const membership = memberships.find((item) => item.pool_id === competition.id);
    return membership?.status !== "approved";
  });

  if (available.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md bg-slate-50 p-2">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        Outros bolões
      </span>
      {available.map((competition) => {
        const membership = memberships.find((item) => item.pool_id === competition.id);
        const isPending = membership?.status === "pending";
        const isRejected = membership?.status === "rejected";

        return (
          <button
            key={competition.id}
            className={[
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-bold transition",
              isPending
                ? "bg-amber-100 text-amber-900"
                : "bg-white text-emerald-800 ring-1 ring-slate-200 hover:ring-emerald-300",
            ].join(" ")}
            disabled={isPending}
            onClick={() => void onRequest(competition.id)}
          >
            {isPending ? <Clock size={14} /> : <Send size={14} />}
            {competition.name}
            {isPending ? "pendente" : isRejected ? "reenviar pedido" : "pedir acesso"}
          </button>
        );
      })}
    </div>
  );
}

function CompetitionAccessPanel({
  competitions,
  memberships,
  onRequest,
}: {
  competitions: Array<{ id: string; name: string; description: string | null }>;
  memberships: Array<{ pool_id: string; status: string }>;
  onRequest: (poolId: string) => Promise<void>;
}) {
  return (
    <section className="surface p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
        Escolha um bolão
      </p>
      <h2 className="mt-2 text-2xl font-black text-emerald-950">
        Peça para participar de uma competição
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Você pode participar de mais de um núcleo de amigos. Depois que o admin
        aprovar, o bolão aparece no seletor do topo.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {competitions.map((competition) => {
          const membership = memberships.find(
            (item) => item.pool_id === competition.id,
          );
          const isPending = membership?.status === "pending";
          const isRejected = membership?.status === "rejected";

          return (
            <article key={competition.id} className="rounded-md border border-slate-200 p-4">
              <h3 className="text-lg font-black text-slate-950">{competition.name}</h3>
              {competition.description ? (
                <p className="mt-1 text-sm text-slate-500">{competition.description}</p>
              ) : null}
              <button
                className="btn-primary mt-4"
                disabled={isPending}
                onClick={() => void onRequest(competition.id)}
              >
                {isPending ? <Clock size={17} /> : <CheckCircle2 size={17} />}
                {isPending
                  ? "Pedido pendente"
                  : isRejected
                    ? "Pedir novamente"
                    : "Solicitar entrada"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
