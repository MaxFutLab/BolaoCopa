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
  { to: "/classificacao", label: "Classificacao", icon: ListChecks },
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
    <div className="sport-shell min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-900/10 bg-white/85 shadow-sm shadow-slate-900/5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-16 w-28 shrink-0 place-items-center overflow-hidden rounded-md border border-slate-200 bg-white p-2 shadow-sm sm:h-20 sm:w-36">
                <img
                  className="brand-mark"
                  src="/brand/max-fut-lab-pro-cropped.png"
                  alt="Max Fut Lab Pro"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">
                  Copa do Mundo 2026
                </p>
                <h1 className="truncate text-xl font-black text-slate-950 sm:text-3xl">
                  Bolao Max Fut Lab Pro
                </h1>
                <p className="hidden text-sm font-semibold text-slate-500 sm:block">
                  Palpites, ranking ao vivo e disputa entre amigos.
                </p>
              </div>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(220px,320px)_auto] sm:items-end">
              {hasApprovedCompetition ? (
                <label className="grid gap-1">
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Bolao atual
                  </span>
                  <select
                    className="field py-2"
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

              <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-slate-200 bg-white/80 px-3 py-2 shadow-sm">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">
                    {profile?.name}
                  </p>
                  <p className="truncate text-xs font-semibold text-slate-500">
                    {profile?.email}
                  </p>
                </div>
                <button
                  className="btn-secondary shrink-0 px-3"
                  onClick={() => void signOut()}
                  title="Sair"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>

          {profile ? (
            <CompetitionRequestBar
              competitions={competitions}
              memberships={memberships}
              onRequest={requestMembership}
            />
          ) : null}

          <div className="w-full min-w-0 max-w-full overflow-hidden rounded-md border border-slate-200 bg-slate-950 p-1 shadow-sm">
            <nav className="no-scrollbar flex w-full min-w-0 max-w-full gap-1 overflow-x-auto">
              {navItems
                .filter((item) => !item.admin || profile?.is_admin)
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        "inline-flex h-10 shrink-0 items-center gap-2 rounded px-3 text-sm font-black transition",
                        isActive
                          ? "bg-sky-500 text-white shadow-sm shadow-sky-500/30"
                          : "text-slate-300 hover:bg-white/10 hover:text-white",
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
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {loading ? (
          <p className="text-sm font-bold text-slate-500">Carregando boloes...</p>
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
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-sky-100 bg-sky-50/80 p-2">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-sky-800">
        Outros boloes
      </span>
      {available.map((competition) => {
        const membership = memberships.find((item) => item.pool_id === competition.id);
        const isPending = membership?.status === "pending";
        const isRejected = membership?.status === "rejected";

        return (
          <button
            key={competition.id}
            className={[
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-black transition",
              isPending
                ? "bg-amber-100 text-amber-900"
                : "bg-white text-sky-800 ring-1 ring-sky-200 hover:ring-sky-400",
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
    <section className="surface tech-panel p-5 sm:p-6">
      <div className="relative">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">
          Escolha um bolao
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
          Peca para participar de uma competicao
        </h2>
        <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-600">
          Voce pode participar de mais de um nucleo de amigos. Depois que o admin
          aprovar, o bolao aparece no seletor do topo.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {competitions.map((competition) => {
            const membership = memberships.find(
              (item) => item.pool_id === competition.id,
            );
            const isPending = membership?.status === "pending";
            const isRejected = membership?.status === "rejected";

            return (
              <article
                key={competition.id}
                className="rounded-md border border-slate-200 bg-white/80 p-4 shadow-sm"
              >
                <h3 className="text-lg font-black text-slate-950">{competition.name}</h3>
                {competition.description ? (
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {competition.description}
                  </p>
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
      </div>
    </section>
  );
}
