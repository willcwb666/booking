"use client";

import Link from "next/link";
import React, { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AuthShell,
  AuthDivider,
  AuthGoogleButton,
  AuthError,
} from "@/components/ui/auth-shell";

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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
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
    } catch {
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
    <AuthShell
      title={t("welcomeBack")}
      subtitle={googleEnabled ? t("loginSubtitleGoogle") : t("loginSubtitle")}
      footer={
        <p>
          {t("noAccount")}{" "}
          <Link href={callbackUrl ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/register"}>
            {t("registerFree")}
          </Link>
        </p>
      }
    >
      {googleEnabled && (
        <>
          <AuthGoogleButton onClick={handleGoogleSignIn}>
            <GoogleIcon /> {t("googleContinue")}
          </AuthGoogleButton>
          <AuthDivider label={t("orEmail")} />
        </>
      )}

      <form onSubmit={handleEmailSignIn} className="auth-form">
        {error && <AuthError message={error} />}

        <div>
          <label className="input-label" htmlFor="email">{t("email")}</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            required
            className="input"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="input-label !mb-0" htmlFor="password">{t("password")}</label>
            <Link href="#" className="text-xs text-primary hover:text-primary-hover transition-colors">
              {t("forgotPassword")}
            </Link>
          </div>
          <div className="relative flex items-center">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              tabIndex={-1}
              className="absolute right-3 text-text-subtle hover:text-text-heading p-1 cursor-pointer transition-colors"
              title={showPassword ? "Ocultar senha" : "Ver senha"}
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.04 10.04 0 013.122-.463c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-9.575-5.411a3 3 0 004.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <label className="auth-checkbox-label">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <span>{t("rememberMe")}</span>
        </label>

        <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
          {loading ? t("loggingIn") : t("loginButton")}
        </button>
      </form>
    </AuthShell>
  );
}
