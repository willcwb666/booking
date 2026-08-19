"use client";

import React, { useState } from "react";

interface CompanyMapRoutesProps {
  address: string;
  companyName: string;
  className?: string;
  brandColor?: string;
}

export function CompanyMapRoutes({
  address,
  companyName,
  className = "",
  brandColor = "#0f172a",
}: CompanyMapRoutesProps) {
  const [copied, setCopied] = useState(false);

  if (!address || address.trim() === "") return null;

  const encodedAddress = encodeURIComponent(address);
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
  const wazeUrl = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;
  const appleMapsUrl = `https://maps.apple.com/?daddr=${encodedAddress}`;
  const embedMapsUrl = `https://maps.google.com/maps?q=${encodedAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  const handleCopyAddress = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(address);
      } else {
        const input = document.createElement("input");
        input.value = address;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className={`p-6 rounded-[var(--radius-panel)] bg-[var(--color-bg)] border border-[var(--color-border)] shadow-sm space-y-5 ${className}`}>
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[var(--text-2xs)] font-bold text-[var(--color-text-subtle)] uppercase tracking-wider flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Localização & Rotas
          </span>
          <h3 className="text-lg font-semibold text-[var(--color-text-heading)] mt-0.5">Como Chegar até Nós</h3>
        </div>

        <button
          onClick={handleCopyAddress}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-control)] bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text)] text-xs font-semibold transition-colors self-start sm:self-auto"
        >
          {copied ? "✓ Endereço Copiado!" : "📋 Copiar Endereço"}
        </button>
      </div>

      {/* Address Text Display */}
      <div className="p-3.5 rounded-[var(--radius-card)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] flex items-start gap-2.5">
        <span className="text-base shrink-0">📍</span>
        <div className="text-xs sm:text-sm text-[var(--color-text)] font-medium">
          <strong className="block text-[var(--color-text-heading)] font-bold">{companyName}</strong>
          {address}
        </div>
      </div>

      {/* Map Embed Preview */}
      <div className="w-full h-52 sm:h-64 rounded-[var(--radius-card)] overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-muted)] relative">
        <iframe
          title={`Mapa de localização para ${companyName}`}
          src={embedMapsUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full grayscale-[20%] contrast-[105%]"
        />
      </div>

      {/* Action Route Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-[var(--radius-control)] text-white font-bold text-xs shadow-sm hover:opacity-90 transition-all text-center"
          style={{ backgroundColor: brandColor }}
        >
          <span>🗺️ Abrir no Google Maps</span>
        </a>

        <a
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-[var(--radius-control)] bg-[var(--color-info-light)] text-[var(--color-info)] hover:bg-[var(--color-info-light)] border border-[var(--color-info-border)] font-bold text-xs transition-all text-center"
        >
          <span>🚗 Navegar pelo Waze</span>
        </a>

        <a
          href={appleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-[var(--radius-control)] bg-[var(--color-bg-muted)] text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] border border-[var(--color-border-strong)] font-bold text-xs transition-all text-center"
        >
          <span>🍏 Apple Maps</span>
        </a>
      </div>
    </div>
  );
}
