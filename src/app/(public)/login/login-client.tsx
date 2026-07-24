"use client";

import Link from "next/link";
import React, { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

const CalendarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function LoginClient({
  googleEnabled,
  callbackUrl,
}: {
  googleEnabled: boolean;
  callbackUrl: string | null;
}) {
  const router = useRouter();
  const t = useTranslations("auth");
  const destination = callbackUrl ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // rememberMe: false → cookie de sessão sem Max-Age, descartado ao fechar o navegador
      const { error } = await signIn.email({
        email,
        password,
        rememberMe,
        callbackURL: destination,
      });
      if (error) {
        setError(error.message || t("loginError"));
      } else {
        router.push(destination);
      }
    } catch (err) {
      setError(t("unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    try {
      const { error } = await signIn.social({
        provider: "google",
        callbackURL: destination,
      });
      if (error) {
        setError(error.message || t("googleError"));
      }
    } catch {
      setError(t("googleError"));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white selection:bg-violet-500/30 selection:text-violet-200 p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[150px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] mix-blend-overlay"></div>
      </div>

      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher className="!bg-zinc-900 !border-white/10 !text-zinc-300" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="flex items-center gap-2 group justify-center mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow">
            <CalendarIcon />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            agendei<span className="text-violet-500">.</span>
          </span>
        </Link>

        <div className="rounded-[2.5rem] bg-zinc-900/60 backdrop-blur-2xl border border-white/10 p-10 shadow-2xl shadow-black">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">{t("welcomeBack")}</h1>
            <p className="text-zinc-400 text-sm">
              {googleEnabled ? t("loginSubtitleGoogle") : t("loginSubtitle")}
            </p>
          </div>

          {googleEnabled && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition-colors mb-6 shadow-sm"
              >
                <GoogleIcon /> {t("googleContinue")}
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="h-px bg-white/10 flex-1"></div>
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">{t("orEmail")}</span>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>
            </>
          )}

          <form onSubmit={handleEmailSignIn} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5" htmlFor="email">{t("email")}</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                required
                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-zinc-300" htmlFor="password">{t("password")}</label>
                <Link href="#" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">{t("forgotPassword")}</Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/50 accent-violet-600"
              />
              <span className="text-sm text-zinc-400">{t("rememberMe")}</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-violet-600 text-white font-bold mt-2 hover:bg-violet-500 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t("loggingIn") : t("loginButton")}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-zinc-400">
            {t("noAccount")} <Link href={callbackUrl ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/register"} className="text-white font-medium hover:text-violet-400 transition-colors">{t("registerFree")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
