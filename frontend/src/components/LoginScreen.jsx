import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Lock, User, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";

const formatErr = (detail) => {
  if (!detail) return "Não foi possível entrar. Tente novamente.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || "").join(" ");
  return String(detail);
};

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(formatErr(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left brand art */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-slate-950">
        <img
          src="https://images.pexels.com/photos/6918658/pexels-photo-6918658.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 to-orange-950/60" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary grid place-items-center font-display font-extrabold text-xl">B</div>
            <div>
              <p className="font-display font-extrabold text-xl leading-none">BRK</p>
              <p className="text-xs uppercase tracking-[0.25em] text-white/60 mt-1">Painel</p>
            </div>
          </div>
          <div>
            <h2 className="font-display text-4xl font-extrabold leading-tight">Painel<br />Administrativo</h2>
            <p className="text-white/70 mt-4 max-w-sm text-sm leading-relaxed">
              Acompanhe faturas geradas, acessos e atividade em tempo real do seu site público — tudo em um só lugar, totalmente privado.
            </p>
          </div>
          <div className="flex items-center gap-2 text-white/50 text-xs">
            <ShieldCheck size={16} /> Área restrita · acesso monitorado
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-primary grid place-items-center font-display font-extrabold text-lg text-primary-foreground">B</div>
            <p className="font-display font-extrabold text-lg">BRK Painel</p>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Entrar no painel</h1>
          <p className="text-muted-foreground text-sm mt-2">Informe suas credenciais de administrador.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Usuário</label>
              <div className="mt-1.5 relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  data-testid="login-username-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="donas"
                  className="w-full h-12 rounded-xl border border-input bg-card pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  autoComplete="username"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Senha</label>
              <div className="mt-1.5 relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  data-testid="login-password-input"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 rounded-xl border border-input bg-card pl-10 pr-11 text-sm outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="login-toggle-password"
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p data-testid="login-error-message" className="text-sm text-destructive font-medium">{error}</p>
            )}

            <button
              data-testid="login-submit-button"
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] transition disabled:opacity-60"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />}
              {loading ? "Entrando..." : "Acessar painel"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
