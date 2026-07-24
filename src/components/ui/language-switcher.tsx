"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

const OPTIONS = [
  { value: "pt-BR", label: "🇧🇷 PT" },
  { value: "en", label: "🇺🇸 EN" },
  { value: "es", label: "🇪🇸 ES" },
  { value: "pt-PT", label: "🇵🇹 PT" },
];

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function change(next: string) {
    // Cookie lido pelo getRequestConfig (src/i18n/request.ts); 1 ano
    document.cookie = `locale=${next};path=/;max-age=31536000;samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <select
      value={locale}
      onChange={(e) => change(e.target.value)}
      disabled={isPending}
      aria-label="Idioma / Language"
      className={`text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
