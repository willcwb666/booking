"use client";

import React, { useState, useTransition } from "react";
import { submitReviewByLinkAction, type ReviewLinkInfo } from "@/server/actions/review-request";
import { Star, Check, AlertTriangle } from "@/components/ui/icons";

type Props = {
  bookingId: string;
  token: string;
  expires: string;
  info: ReviewLinkInfo;
};

const RATING_HINTS: Record<number, string> = {
  1: "Foi ruim",
  2: "Deixou a desejar",
  3: "Deu para o gasto",
  4: "Foi bom",
  5: "Foi ótimo",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--color-bg-page)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-panel)] p-6 shadow-xs">
        {children}
      </div>
    </div>
  );
}

export function AvaliarClient({ bookingId, token, expires, info }: Props) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ googleReviewUrl: string | null; isLowRating: boolean } | null>(
    null
  );

  if (!info.valid) {
    return (
      <Shell>
        <p className="flex items-start gap-2 text-sm text-[var(--color-danger)]">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {info.error}
        </p>
      </Shell>
    );
  }

  if (info.alreadyReviewed && !done) {
    return (
      <Shell>
        <p className="flex items-start gap-2 text-sm text-[var(--color-text)]">
          <Check className="w-5 h-5 shrink-0 text-[var(--color-success)]" />
          Este atendimento já foi avaliado. Obrigado!
        </p>
      </Shell>
    );
  }

  // ── Depois de enviar ──────────────────────────────────────────────────────
  if (done) {
    return (
      <Shell>
        <div className="space-y-4 text-center">
          <span className="inline-flex w-12 h-12 rounded-full bg-[var(--color-success-light)] text-[var(--color-success)] items-center justify-center">
            <Check className="w-6 h-6" />
          </span>

          <h1 className="text-lg font-semibold text-[var(--color-text-heading)]">
            Obrigado pela avaliação
          </h1>

          {done.isLowRating ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              Avisamos a {info.companyName} agora mesmo. Se quiserem resolver, vão
              entrar em contato com você.
            </p>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              Fico feliz que tenha sido uma boa experiência.
            </p>
          )}

          {/* O convite para o Google aparece para QUALQUER nota.
              Mostrar só para quem avaliou bem é "review gating" — viola a
              política do Google Business Profile e a regra da FTC, e pode
              custar o perfil da empresa no Maps. */}
          {done.googleReviewUrl && (
            <div className="pt-4 border-t border-[var(--color-border)] space-y-2">
              <p className="text-sm text-[var(--color-text)]">
                Quer deixar isso público no Google também?
              </p>
              <a
                href={done.googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm w-full"
              >
                Avaliar no Google
              </a>
              <p
                className="text-[var(--color-text-subtle)]"
                style={{ fontSize: "var(--text-2xs)" }}
              >
                Escreva com suas palavras — é a sua experiência.
              </p>
            </div>
          )}
        </div>
      </Shell>
    );
  }

  // ── Formulário ────────────────────────────────────────────────────────────
  const submit = () => {
    if (rating === 0) {
      setError("Escolha uma nota de 1 a 5.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitReviewByLinkAction(bookingId, token, expires, rating, comment);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setDone({ googleReviewUrl: res.googleReviewUrl, isLowRating: res.isLowRating });
    });
  };

  const shown = hovered || rating;

  return (
    <Shell>
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-text-heading)]">
            {info.customerName ? `Olá, ${info.customerName}!` : "Olá!"}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Como foi seu atendimento de <strong>{info.serviceName}</strong> na{" "}
            {info.companyName}?
          </p>
        </div>

        <div>
          <div className="flex justify-center gap-1" role="radiogroup" aria-label="Nota">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} estrela${n === 1 ? "" : "s"}`}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                className="p-1.5 rounded-[var(--radius-control)] transition-transform active:scale-95"
              >
                <Star
                  className={`w-9 h-9 ${
                    n <= shown
                      ? "text-[var(--color-warning)] fill-[var(--color-warning)]"
                      : "text-[var(--color-border-strong)]"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-[var(--color-text-muted)] mt-1 h-4">
            {shown > 0 ? RATING_HINTS[shown] : ""}
          </p>
        </div>

        <div>
          <label
            htmlFor="comment"
            className="block text-xs font-bold text-[var(--color-text)] mb-1"
          >
            {/* A pergunta muda com a nota: pedir "o que podemos melhorar" a quem
                deu cinco estrelas é estranho, e pedir "o que você mais gostou" a
                quem deu uma é ofensivo. */}
            {rating > 0 && rating <= 3
              ? "O que deu errado? (opcional)"
              : "O que você mais gostou? (opcional)"}
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={800}
            className="input"
            placeholder={
              rating > 0 && rating <= 3
                ? "Conte o que aconteceu — dá para resolver."
                : "Escreva com suas palavras."
            }
          />
        </div>

        {error && (
          <p className="text-xs font-semibold text-[var(--color-danger)]">{error}</p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="btn btn-primary w-full"
        >
          {isPending ? "Enviando…" : "Enviar avaliação"}
        </button>
      </div>
    </Shell>
  );
}
