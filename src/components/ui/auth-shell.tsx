"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { KreatorLogo } from "@/components/ui/kreator-logo";

type AuthShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
  wide?: boolean;
};

export function AuthShell({ children, title, subtitle, footer, wide }: AuthShellProps) {
  return (
    // Fundo pelo token, não `#FAFAFA` fixo — no modo escuro a página inteira
    // ficava clara com texto claro por cima.
    <div className="auth-page min-h-dvh bg-[var(--color-bg-page)] text-[var(--color-text-heading)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>

      <div className={`auth-container ${wide ? "auth-container--wide" : ""} w-full max-w-md mx-auto`}>
        <Link href="/" className="auth-brand flex items-center justify-center mb-8" aria-label="Kreator Início">
          <KreatorLogo size={36} textClassName="font-semibold text-[var(--color-text-heading)] text-xl tracking-tight" />
        </Link>

        <div className="auth-card card-tactile shadow-sm rounded-[var(--radius-panel)] p-8 sm:p-10 border border-[var(--color-border)] bg-[var(--color-bg)]">
          <div className="auth-card-header mb-6 text-center">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--color-text-heading)] tracking-tight mb-1.5">{title}</h1>
            <p className="text-sm text-[var(--color-text-muted)] font-medium">{subtitle}</p>
          </div>
          {children}
          {footer && <div className="auth-card-footer mt-6 pt-5 border-t border-[var(--color-border)] text-center text-xs text-[var(--color-text-muted)] font-medium">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="auth-divider my-5 flex items-center gap-3">
      <div className="auth-divider-line flex-1 h-[1px] bg-[var(--color-bg-muted)]" />
      <span className="auth-divider-label text-[var(--text-2xs)] font-mono font-bold uppercase tracking-wider text-[var(--color-text-subtle)]">{label}</span>
      <div className="auth-divider-line flex-1 h-[1px] bg-[var(--color-bg-muted)]" />
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
    <button
      type="button"
      onClick={onClick}
      className="btn-tactile w-full py-3 px-4 rounded-[var(--radius-card)] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-sm font-bold shadow-2xs hover:bg-[var(--color-bg-subtle)] flex items-center justify-center gap-2.5 transition-all"
    >
      {children}
    </button>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div className="p-3.5 rounded-[var(--radius-card)] bg-[var(--color-danger-light)] border border-[var(--color-danger-border)] text-[var(--color-danger)] text-xs font-bold mb-4 animate-in fade-in duration-200">
      {message}
    </div>
  );
}
