"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { KreatorIcon } from "@/components/ui/kreator-logo";

type AuthShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
  wide?: boolean;
};

export function AuthShell({ children, title, subtitle, footer, wide }: AuthShellProps) {
  return (
    <div className="auth-page">
      <div className="auth-page-bg" aria-hidden="true">
        <div className="auth-page-glow auth-page-glow--primary" />
        <div className="auth-page-glow auth-page-glow--secondary" />
      </div>

      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>

      <div className={`auth-container ${wide ? "auth-container--wide" : ""}`}>
        <Link href="/" className="auth-brand">
          <KreatorIcon size={40} />
          <span className="auth-brand-text">
            kreator<span className="text-primary">.</span>
          </span>
        </Link>

        <div className="auth-card">
          <div className="auth-card-header">
            <h1 className="auth-card-title">{title}</h1>
            <p className="auth-card-subtitle">{subtitle}</p>
          </div>
          {children}
          {footer && <div className="auth-card-footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="auth-divider">
      <div className="auth-divider-line" />
      <span className="auth-divider-label">{label}</span>
      <div className="auth-divider-line" />
    </div>
  );
}

export function AuthGoogleButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="btn btn-secondary w-full !py-3">
      {children}
    </button>
  );
}

export function AuthError({ message }: { message: string }) {
  return <div className="alert alert-danger mb-4">{message}</div>;
}
