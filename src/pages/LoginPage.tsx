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
            "Conta criada. Confira seu email e clique no link de confirmação antes de entrar.",
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
    <main className="grid min-h-screen bg-[#f7f9f5] px-4 py-10">
      <section className="m-auto grid w-full max-w-5xl overflow-hidden rounded-lg border border-emerald-900/10 bg-white shadow-sm lg:grid-cols-[1fr_420px]">
        <div className="bg-emerald-950 p-8 text-white sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
            Copa do Mundo 2026
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-black leading-tight sm:text-5xl">
            Bolão simples, justo e ao vivo.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-emerald-50">
            Palpites de jogos, classificados, pódio final e ranking em tempo real
            para acompanhar a disputa entre amigos.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-emerald-50 sm:grid-cols-3">
            <div className="rounded-md bg-white/10 p-4">
              <b className="block text-xl text-amber-300">3</b>
              placar exato
            </div>
            <div className="rounded-md bg-white/10 p-4">
              <b className="block text-xl text-amber-300">1</b>
              desfecho certo
            </div>
            <div className="rounded-md bg-white/10 p-4">
              <b className="block text-xl text-amber-300">10</b>
              campeão
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-6 flex gap-2 rounded-md bg-slate-100 p-1">
            {[
              ["signin", "Entrar"],
              ["signup", "Criar conta"],
              ["reset", "Recuperar"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={[
                  "flex-1 rounded-md px-3 py-2 text-sm font-bold transition",
                  mode === value ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500",
                ].join(" ")}
                onClick={() => setMode(value as Mode)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          {!isSupabaseConfigured ? (
            <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Modo demo ativo. Configure o `.env` para usar autenticação e dados reais.
            </div>
          ) : null}

          <form className="grid gap-4" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <label className="grid gap-1">
                <span className="text-sm font-bold text-slate-700">Nome</span>
                <input
                  className="field"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
            ) : null}

            <label className="grid gap-1">
              <span className="text-sm font-bold text-slate-700">Email</span>
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
                <span className="text-sm font-bold text-slate-700">Senha</span>
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

            <button className="btn-primary mt-2" disabled={loading}>
              {mode === "signin" ? <ShieldCheck size={18} /> : null}
              {mode === "signup" ? <UserPlus size={18} /> : null}
              {mode === "reset" ? <Mail size={18} /> : null}
              {mode === "signin" && "Entrar"}
              {mode === "signup" && "Criar conta"}
              {mode === "reset" && "Enviar recuperação"}
            </button>

            {message ? (
              <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                {message}
              </p>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  );
}

function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();

  if (normalized.includes("email not confirmed")) {
    return "Seu email ainda não foi confirmado. Abra o email recebido e clique no link de confirmação.";
  }

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return "Email ou senha inválidos. Se você acabou de criar a conta, confirme o email antes de entrar.";
  }

  return message || "Não foi possível continuar.";
}
