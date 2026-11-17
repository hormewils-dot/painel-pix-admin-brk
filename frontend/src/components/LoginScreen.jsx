import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

const DONATELO =
  "https://customer-assets-4nw71qhi.emergentagent.net/job_painel-pix-admin--8o1srzaj/artifacts/c4492971873a2232_donatelo.jpg";

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
    <div className="min-h-screen w-full flex bg-[#140d24] text-white selection:bg-violet-500/40">
      {/* Left — hero image */}
      <div className="relative hidden lg:block w-[46%] overflow-hidden">
        <img src={DONATELO} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-[#140d24]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#140d24]/90 via-transparent to-black/30" />

        {/* Restricted pill */}
        <div className="absolute top-8 left-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/15 backdrop-blur px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-200">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-300 animate-pulse" />
            Acesso Restrito
          </span>
        </div>

        {/* Quote */}
        <div className="absolute bottom-10 left-8 right-10">
          <p className="font-display text-lg italic leading-relaxed text-white/90 max-w-md">
            "O conhecimento é como uma escada: quanto mais alto você sobe, mais{" "}
            <span className="font-bold not-italic underline decoration-violet-400 decoration-2 underline-offset-4">
              ampla é sua visão
            </span>
            ."
          </p>
        </div>
      </div>

      {/* Right — login card */}
      <div className="flex-1 relative flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_rgba(139,92,246,0.22),_transparent_60%)]">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_bottom,_rgba(124,58,237,0.14),_transparent_55%)]" />
        <div
          data-testid="login-card"
          className="relative z-10 w-full max-w-md rounded-3xl border border-violet-400/15 bg-[#1b1333]/80 backdrop-blur-xl p-8 sm:p-10 shadow-[0_30px_80px_-20px_rgba(76,29,149,0.6)]"
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 grid place-items-center font-display font-extrabold text-xl shadow-lg shadow-violet-900/50">
              P
            </div>
            <div className="leading-none">
              <p className="font-display font-extrabold text-lg">PMSC</p>
              <p className="text-xs text-violet-300/70 mt-1 uppercase tracking-wider">PMSC</p>
            </div>
          </div>

          <h1 className="font-display text-3xl font-extrabold tracking-tight mt-8">Acessar painel</h1>
          <p className="text-violet-200/60 text-sm mt-2">Digite suas credenciais para continuar.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-violet-200/70">Usuário</label>
              <input
                data-testid="login-username-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="donas"
                autoComplete="username"
                className="mt-2 w-full h-12 rounded-xl border border-violet-400/20 bg-white/95 text-slate-900 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-violet-400 placeholder:text-slate-400 transition-shadow"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-violet-200/70">Senha</label>
              <div className="mt-2 relative">
                <input
                  data-testid="login-password-input"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  className="w-full h-12 rounded-xl border border-violet-400/20 bg-white/95 text-slate-900 pl-4 pr-11 text-sm font-medium outline-none focus:ring-2 focus:ring-violet-400 transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  data-testid="login-toggle-password"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p data-testid="login-error-message" className="text-sm text-rose-300 font-medium">
                {error}
              </p>
            )}

            <button
              data-testid="login-submit-button"
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] transition shadow-lg shadow-violet-900/40 disabled:opacity-60"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? "Entrando..." : "Entrar"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-2 text-violet-200/50 text-xs">
            <ShieldCheck size={14} /> Conexão segura · Apenas administradores autorizados
          </div>
        </div>
      </div>
    </div>
  );
}
