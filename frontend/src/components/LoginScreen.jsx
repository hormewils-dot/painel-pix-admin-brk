import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, ShieldCheck, ArrowRight, Loader2, Receipt } from "lucide-react";

const HERO =
  "https://customer-assets-4nw71qhi.emergentagent.net/job_painel-pix-admin--8o1srzaj/artifacts/e39b2efe3be21dc5_image.png";

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
    <div className="min-h-screen w-full relative overflow-hidden bg-[#0b0a08] text-white selection:bg-amber-500/40">
      {/* Full-bleed hero */}
      <img src={HERO} alt="" className="absolute inset-0 h-full w-full object-cover" />
      {/* Cinematic overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b0a08] via-[#0b0a08]/55 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0a08] via-transparent to-[#0b0a08]/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_rgba(0,0,0,0.5),_transparent_60%)]" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 sm:px-12 pt-8">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 grid place-items-center shadow-lg shadow-orange-900/50">
              <Receipt size={22} className="text-black/80" />
            </div>
            <div className="leading-none">
              <p className="font-display font-extrabold text-lg">BRK <span className="text-amber-400">Faturas</span></p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200/60 mt-1">Painel Admin</p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 backdrop-blur px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Acesso Restrito
          </span>
        </header>

        {/* Body */}
        <div className="flex-1 flex items-center px-6 sm:px-12 lg:px-20 py-10">
          <div className="w-full grid lg:grid-cols-2 gap-10 items-center">
            {/* Left tagline */}
            <div className="hidden lg:block max-w-lg">
              <h2 className="font-display text-5xl xl:text-6xl font-black leading-[1.05] tracking-tight">
                Vigilância<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-500">em tempo real</span>
              </h2>
              <p className="text-white/70 mt-6 text-base leading-relaxed">
                Acompanhe cada fatura, acesso e PIX do seu site público — de um ponto alto, com visão total da operação.
              </p>
              <div className="mt-8 flex items-center gap-6 text-sm text-white/50">
                <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-amber-400" /> Área privada</span>
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Monitoramento ativo</span>
              </div>
            </div>

            {/* Right login card */}
            <div className="w-full flex lg:justify-end">
              <div
                data-testid="login-card"
                className="w-full max-w-md rounded-3xl border border-white/10 bg-black/45 backdrop-blur-2xl p-8 sm:p-10 shadow-[0_40px_90px_-25px_rgba(0,0,0,0.9)]"
              >
                <h1 className="font-display text-3xl font-extrabold tracking-tight">Acessar painel</h1>
                <p className="text-white/50 text-sm mt-2">Digite suas credenciais para continuar.</p>

                <form onSubmit={submit} className="mt-7 space-y-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-amber-200/70">Usuário</label>
                    <input
                      data-testid="login-username-input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="donas"
                      autoComplete="username"
                      className="mt-2 w-full h-12 rounded-xl border border-white/10 bg-white/5 text-white px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400/70 focus:border-transparent placeholder:text-white/30 transition-shadow"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-amber-200/70">Senha</label>
                    <div className="mt-2 relative">
                      <input
                        data-testid="login-password-input"
                        type={show ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••"
                        autoComplete="current-password"
                        className="w-full h-12 rounded-xl border border-white/10 bg-white/5 text-white pl-4 pr-11 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400/70 focus:border-transparent placeholder:text-white/30 transition-shadow"
                      />
                      <button
                        type="button"
                        onClick={() => setShow((s) => !s)}
                        data-testid="login-toggle-password"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
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
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-400 to-orange-600 text-black font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] transition shadow-lg shadow-orange-900/40 disabled:opacity-60"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                    {loading ? "Entrando..." : "Entrar"}
                    {!loading && <ArrowRight size={16} />}
                  </button>
                </form>

                <div className="mt-6 flex items-center gap-2 text-white/40 text-xs">
                  <ShieldCheck size={14} /> Conexão segura · Apenas administradores autorizados
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
