"use client";

import React, { useState } from "react";

interface CustomLinkShareProps {
  slug: string;
  companyName: string;
  className?: string;
  brandColor?: string;
  bookingUrl?: string;
  /**
   * Origem resolvida no servidor (ver `@/lib/site-url`). Obrigatoria de
   * proposito: com valor padrao, quem esquecesse de passar voltaria a exibir um
   * dominio chumbado sem nenhum aviso.
   */
  origin: string;
}

export function CustomLinkShare({
  slug,
  companyName,
  className = "",
  brandColor = "#0f172a",
  bookingUrl,
  origin,
}: CustomLinkShareProps) {
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // A origem chega pronta do servidor. Ler `window.location` aqui fazia o HTML
  // do servidor e o do cliente divergirem — ver `@/lib/site-url`.
  const customUrl = bookingUrl ? `${origin}${bookingUrl}` : `${origin}/book/${slug}`;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(customUrl);
      } else {
        const input = document.createElement("input");
        input.value = customUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const shareText = encodeURIComponent(
    `Agende seu horário online com ${companyName} de forma rápida e segura:`
  );
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${shareText}%20${encodeURIComponent(customUrl)}`;
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(customUrl)}&text=${shareText}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(customUrl)}`;

  return (
    <div className={`p-5 rounded-[var(--radius-card)] bg-[var(--color-bg)] border border-[var(--color-border)] shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <span className="text-[var(--text-2xs)] font-bold text-[var(--color-text-subtle)] uppercase tracking-wider flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Link Personalizado Exclusivo
          </span>
          <h4 className="text-sm font-bold text-[var(--color-text-heading)] mt-0.5">Compartilhe sua página de agendamentos</h4>
        </div>

        <button
          onClick={() => setShowShareModal(!showShareModal)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-control)] bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text)] text-xs font-semibold transition-colors self-start sm:self-auto"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Compartilhar
        </button>
      </div>

      {/* Copy link bar */}
      <div className="flex items-center gap-2 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] p-1.5 pl-3">
        <span className="text-xs text-[var(--color-text-muted)] font-mono truncate flex-1 select-all">
          {customUrl}
        </span>
        <button
          onClick={handleCopy}
          className="px-3.5 py-1.5 rounded-[var(--radius-control)] text-xs font-bold text-white transition-all shrink-0 flex items-center gap-1.5 active:scale-95"
          style={{ backgroundColor: copied ? "#059669" : brandColor }}
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Copiado!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copiar Link</span>
            </>
          )}
        </button>
      </div>

      {/* Social Share Options */}
      {showShareModal && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex flex-wrap items-center gap-2 animate-in fade-in duration-200">
          <span className="text-[var(--text-2xs)] font-semibold text-[var(--color-text-muted)] mr-1">Enviar via:</span>
          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-control)] bg-[var(--color-success-light)] text-[var(--color-success)] hover:bg-[var(--color-success-light)] text-xs font-bold transition-colors"
          >
            <span>📱 WhatsApp</span>
          </a>
          <a
            href={telegramShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-control)] bg-[var(--color-info-light)] text-[var(--color-info)] hover:bg-[var(--color-info-light)] text-xs font-bold transition-colors"
          >
            <span>✈️ Telegram</span>
          </a>
          <a
            href={twitterShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-control)] bg-[var(--color-bg-muted)] text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] text-xs font-bold transition-colors"
          >
            <span>𝕏 Twitter</span>
          </a>
        </div>
      )}
    </div>
  );
}
