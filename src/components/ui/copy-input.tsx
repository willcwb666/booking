"use client";

import React, { useState } from "react";

interface CopyInputProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyInput({ value, label, className = "" }: CopyInputProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className={`w-full space-y-1 ${className}`}>
      {label && <label className="block text-xs font-semibold text-stone-700">{label}</label>}
      <div className="relative flex items-center">
        <input
          readOnly
          value={value}
          className="w-full border border-stone-200 rounded-xl pl-3 pr-10 py-2.5 text-xs text-stone-700 bg-stone-50/80 font-mono focus:outline-none"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="absolute right-2 p-1.5 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-200/50 transition-all cursor-pointer"
          title={copied ? "Copiado!" : "Copiar link"}
          aria-label={copied ? "Copiado!" : "Copiar link"}
        >
          {copied ? (
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
