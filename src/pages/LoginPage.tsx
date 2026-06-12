import { FormEvent, useState } from "react";
import { Mail, ShieldCheck, UserPlus } from "lucide-react";
import { useAuth } from "../lib/auth";
import { isSupabaseConfigured } from "../lib/supabase";

type Mode = "signin" | "signup" | "reset";

export function LoginPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("demo@bolao.local");
  const [password, setPassword] = useState("12345678");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "signin") await signIn(email, password);
      if (mode === "signup") {
        const result = await signUp(name, email, password);
        if (result === "check-email") {
          setMode("signin");
          setMessage(
            "Conta criada. Confira seu email e clique no link de confirmacao antes de entrar.",
          );
        }
      }
      if (mode === "reset") {
        await resetPassword(email);
        setMessage(
          "Se o email existir, enviaremos um link para criar uma nova senha.",
        );
      }
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="sport-shell grid min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="m-auto grid w-full max-w-6xl overflow-hidden rounded-lg border border-white/70 bg-white/90 shadow-xl shadow-slate-900/10 backdrop-blur lg:grid-cols-[minmax(0,1.1fr)_430px]">
        <div className="tech-panel relative grid min-h-[360px] overflow-hidden bg-slate-950 p-6 text-white sm:p-10">
          <div className="relative z-10 flex flex-col justify-between gap-10">
            <div>
              <div className="grid h-28 w-52 place-items-center overflow-hidden rounded-md border border-white/15 bg-white p-3 shadow-lg shadow-sky-950/30 sm:h-36 sm:w-72">
                <img
                  className="brand-mark"
                  src="/brand/max-fut-lab-pro-cropped.png"
                  alt="Max Fut Lab Pro"
                />
              </div>
              <p className="mt-8 text-xs font-black uppercase tracking-[0.24em] text-sky-300">
                Copa do Mundo 2026
              </p>
              <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight sm:text-6xl">
                Bolao esportivo, rapido e ao vivo.
              </h1>
              <p className="mt-4 max-w-xl text-sm font-semibold leading-6 text-slate-300">
                Palpites de jogos, classificados, podio final e ranking em tempo
                real para sua turma competir no estilo Max Fut Lab Pro.
              </p>
            </div>

            <div className="grid gap-3 text-sm font-black text-white sm:grid-cols-3">
              <ScorePill value="3" label="placar exato" />
              <ScorePill value="1" label="desfecho certo" />
              <ScorePill value="10" label="campeao" />
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-8">
          <div className="mb-6 grid grid-cols-3 gap-1 rounded-md bg-slate-100 p-1">
            {[
              ["signin", "Entrar"],
              ["signup", "Criar conta"],
              ["reset", "Recuperar"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={[
                  "h-11 rounded-md px-2 text-sm font-black transition",
                  mode === value
                    ? "bg-white text-sky-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-900",
                ].join(" ")}
                onClick={() => setMode(value as Mode)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          {!isSupabaseConfigured ? (
            <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
              Modo demo ativo. Configure o `.env` para usar autenticacao e dados reais.
            </div>
          ) : null}

          <form className="grid gap-4" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <label className="grid gap-1">
                <span className="text-sm font-black text-slate-700">Nome</span>
                <input
                  className="field"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
            ) : null}

            <label className="grid gap-1">
              <span className="text-sm font-black text-slate-700">Email</span>
              <input
                className="field"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            {mode !== "reset" ? (
              <label className="grid gap-1">
                <span className="text-sm font-black text-slate-700">Senha</span>
                <input
                  className="field"
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
            ) : null}

            <button className="btn-primary mt-2 h-12" disabled={loading}>
              {mode === "signin" ? <ShieldCheck size={18} /> : null}
              {mode === "signup" ? <UserPlus size={18} /> : null}
              {mode === "reset" ? <Mail size={18} /> : null}
              {mode === "signin" && "Entrar"}
              {mode === "signup" && "Criar conta"}
              {mode === "reset" && "Enviar recuperacao"}
            </button>

            {message ? (
              <p className="rounded-md bg-amber-50 p-3 text-sm font-bold text-amber-900">
                {message}
              </p>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  );
}

function ScorePill({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/10 p-4">
      <b className="block text-2xl text-sky-300">{value}</b>
      <span className="text-slate-200">{label}</span>
    </div>
  );
}

function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();

  if (normalized.includes("email not confirmed")) {
    return "Seu email ainda nao foi confirmado. Abra o email recebido e clique no link de confirmacao.";
  }

  if (
    normalized.includes("email rate limit exceeded") ||
    normalized.includes("rate limit")
  ) {
    return "Limite de envio de emails atingido no Supabase. Aguarde alguns minutos ou configure SMTP proprio no Supabase para liberar mais envios.";
  }

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return "Email ou senha invalidos. Se voce acabou de criar a conta, confirme o email antes de entrar.";
  }

  return message || "Nao foi possivel continuar.";
}
