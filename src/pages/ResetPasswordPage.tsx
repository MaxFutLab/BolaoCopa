import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function ResetPasswordPage() {
  const { updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password.length < 6) {
      setMessage("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("As senhas não conferem.");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      await signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a senha.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f7f9f5] px-4 py-10">
      <section className="m-auto w-full max-w-md rounded-lg border border-emerald-900/10 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
          Recuperação de senha
        </p>
        <h1 className="mt-2 text-2xl font-black text-emerald-950">
          Criar nova senha
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Digite a nova senha para sua conta e entre novamente.
        </p>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1">
            <span className="text-sm font-bold text-slate-700">Nova senha</span>
            <input
              className="field"
              type="password"
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-bold text-slate-700">
              Confirmar nova senha
            </span>
            <input
              className="field"
              type="password"
              minLength={6}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>
          <button className="btn-primary" disabled={loading}>
            <KeyRound size={18} />
            Salvar nova senha
          </button>
          {message ? (
            <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              {message}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
