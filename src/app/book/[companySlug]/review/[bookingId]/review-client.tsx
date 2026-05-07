"use client";

import { useState, useTransition } from "react";
import { submitReviewAction } from "@/server/actions/review";

type Props = {
  bookingId: string;
  companyName: string;
  customerFirstName: string | null;
  scheduledDate: string;
  serviceLabels: string[];
  alreadyReviewed: boolean;
};

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex gap-1" role="group" aria-label="Avaliação em estrelas">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
          aria-pressed={value === star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-3xl transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          <span className={display >= star ? "text-yellow-400" : "text-gray-200"}>★</span>
        </button>
      ))}
    </div>
  );
}

const STAR_LABELS = ["", "Péssimo", "Ruim", "Regular", "Bom", "Excelente"];

export function ReviewClient({
  bookingId,
  companyName,
  customerFirstName,
  scheduledDate,
  serviceLabels,
  alreadyReviewed,
}: Props) {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(alreadyReviewed);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (rating === 0) { setError("Selecione uma avaliação"); return; }
    const fd = new FormData(e.currentTarget);
    fd.set("bookingId", bookingId);
    fd.set("rating", String(rating));
    startTransition(async () => {
      const result = await submitReviewAction(fd);
      if (!result.success) { setError(result.error); return; }
      setSubmitted(true);
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl font-bold">{companyName[0].toUpperCase()}</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">{companyName}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Serviço em {scheduledDate.split("-").reverse().join("/")}
          </p>
          {serviceLabels.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{serviceLabels[0]}</p>
          )}
        </div>

        {submitted ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              Obrigado pela avaliação!
            </h2>
            <p className="text-sm text-gray-500">
              Seu feedback ajuda {companyName} a melhorar cada vez mais.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="text-center text-sm text-gray-700 mb-5">
              {customerFirstName ? `Olá, ${customerFirstName}! Como` : "Como"} foi seu
              atendimento?
            </p>

            <div className="flex flex-col items-center gap-2 mb-6">
              <StarRating value={rating} onChange={setRating} />
              <p className="text-sm font-medium text-gray-600 h-5">
                {rating > 0 ? STAR_LABELS[rating] : ""}
              </p>
            </div>

            <div className="mb-5">
              <label htmlFor="comment" className="block text-sm text-gray-600 mb-1.5">
                Comentário (opcional)
              </label>
              <textarea
                id="comment"
                name="comment"
                rows={3}
                placeholder="Conte como foi sua experiência…"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600 mb-3 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={pending || rating === 0}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pending ? "Enviando…" : "Enviar avaliação"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
