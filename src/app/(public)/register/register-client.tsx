"use client";

import Link from "next/link";
import React, { useState } from "react";
import { signUp, signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { setMarketingOptInAction } from "@/server/actions/profile";
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

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CheckSmallIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function RegisterClient({
  googleEnabled,
  callbackUrl,
}: {
  googleEnabled: boolean;
  callbackUrl: string | null;
}) {
  const router = useRouter();
  const t = useTranslations("auth");
  const destination = callbackUrl ?? "/onboarding";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptMarketing, setAcceptMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordValidations = [
    { text: t("valMinChars"), passed: password.length >= 8 },
    { text: t("valLetters"), passed: /[a-zA-Z]/.test(password) },
    { text: t("valNumbers"), passed: /[0-9]/.test(password) },
    { text: t("valSpecial"), passed: /[^a-zA-Z0-9]/.test(password) },
  ];
  const isPasswordValid = passwordValidations.every((v) => v.passed);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) return;
    setLoading(true);
    setError("");

    try {
      const { error } = await signUp.email({
        email,
        password,
        name: `${firstName} ${lastName}`.trim(),
        callbackURL: destination,
      });

      if (error) {
        setError(error.message || t("registerError"));
      } else {
        if (acceptMarketing) {
          await setMarketingOptInAction(true).catch(() => {});
        }
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
        setError(error.message || t("googleRegisterError"));
      }
    } catch {
      setError(t("googleRegisterError"));
    }
  };

  return (
    <AuthShell
      wide
      title={t("registerTitle")}
      subtitle={googleEnabled ? t("registerSubtitleGoogle") : t("registerSubtitle")}
      footer={
        <p>
          {t("haveAccount")}{" "}
          <Link href={callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"}>
            {t("doLogin")}
          </Link>
        </p>
      }
    >
      {googleEnabled && (
        <>
          <AuthGoogleButton onClick={handleGoogleSignIn}>
            <GoogleIcon /> {t("googleRegister")}
          </AuthGoogleButton>
          <AuthDivider label={t("orEmail")} />
        </>
      )}

      <form onSubmit={handleEmailSignUp} className="auth-form">
        {error && <AuthError message={error} />}

        <div className="auth-form-row">
          <div>
            <label className="input-label" htmlFor="firstName">{t("firstName")}</label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t("firstNamePlaceholder")}
              required
              className="input"
            />
          </div>
          <div>
            <label className="input-label" htmlFor="lastName">{t("lastName")}</label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t("lastNamePlaceholder")}
              required
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="input-label" htmlFor="email">{t("workEmail")}</label>
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
          <label className="input-label" htmlFor="password">{t("createPassword")}</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordPlaceholder")}
            required
            className="input"
          />
          <div className="auth-password-hints">
            {passwordValidations.map((val, idx) => (
              <div
                key={idx}
                className={`auth-password-hint ${val.passed ? "auth-password-hint--valid" : "auth-password-hint--invalid"}`}
              >
                {val.passed ? <CheckSmallIcon /> : <XIcon />}
                <span>{val.text}</span>
              </div>
            ))}
          </div>
        </div>

        <label className="auth-checkbox-label">
          <input
            type="checkbox"
            checked={acceptMarketing}
            onChange={(e) => setAcceptMarketing(e.target.checked)}
          />
          <span>{t("marketingOptIn")}</span>
        </label>

        <button
          type="submit"
          disabled={loading || !isPasswordValid}
          className="btn btn-primary btn-lg w-full btn-tactile"
        >
          {loading ? t("creating") : t("createAccount")}
        </button>
      </form>
    </AuthShell>
  );
}
