"use client";

import React, { useState } from "react";
import { HelpCircle, Info, Sparkles, Lightbulb } from "lucide-react";

interface HelpHintProps {
  title?: string;
  children: React.ReactNode;
  variant?: "help" | "info" | "tip" | "ai";
  className?: string;
  position?: "top" | "bottom" | "left" | "right";
}

export function HelpHint({
  title,
  children,
  variant = "help",
  className = "",
  position = "top",
}: HelpHintProps) {
  const [isOpen, setIsOpen] = useState(false);

  const icons = {
    help: <HelpCircle className="w-3.5 h-3.5" />,
    info: <Info className="w-3.5 h-3.5" />,
    tip: <Lightbulb className="w-3.5 h-3.5" />,
    ai: <Sparkles className="w-3.5 h-3.5" />,
  };

  const badgeStyles = {
    help: "text-[var(--color-text-subtle)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] border-[var(--color-border)]",
    info: "text-[var(--color-info)] hover:text-[var(--color-info)] hover:bg-[var(--color-info-light)] border-[var(--color-info-border)]",
    tip: "text-[var(--color-warning)] hover:text-[var(--color-warning)] hover:bg-[var(--color-warning-light)] border-[var(--color-warning-border)]",
    ai: "text-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] border-[var(--color-primary)]",
  };

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={() => setIsOpen(!isOpen)}
    >
      <button
        type="button"
        aria-label="Ajuda e Dicas"
        className={`p-0.5 rounded-full border transition-all cursor-pointer inline-flex items-center justify-center ${badgeStyles[variant]}`}
      >
        {icons[variant]}
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className={`absolute z-[9999] w-64 p-3 bg-[var(--color-navy)] text-white text-xs rounded-[var(--radius-card)] shadow-2xl backdrop-blur-md border border-[var(--color-navy)] pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95 ${positionClasses[position]}`}
        >
          {title && (
            <p className="font-semibold text-[var(--text-2xs)] text-white flex items-center gap-1.5 mb-1 text-left">
              {icons[variant]}
              <span>{title}</span>
            </p>
          )}
          <div className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] font-normal leading-relaxed text-left">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
