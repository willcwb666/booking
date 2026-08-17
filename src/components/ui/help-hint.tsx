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
    help: "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border-slate-200",
    info: "text-blue-500 hover:text-blue-700 hover:bg-blue-50 border-blue-200",
    tip: "text-amber-500 hover:text-amber-700 hover:bg-amber-50 border-amber-200",
    ai: "text-purple-500 hover:text-purple-700 hover:bg-purple-50 border-purple-200",
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
          className={`absolute z-[9999] w-64 p-3 bg-slate-900/95 text-white text-xs rounded-2xl shadow-2xl backdrop-blur-md border border-slate-700/60 pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95 ${positionClasses[position]}`}
        >
          {title && (
            <p className="font-extrabold text-[11px] text-white flex items-center gap-1.5 mb-1 text-left">
              {icons[variant]}
              <span>{title}</span>
            </p>
          )}
          <div className="text-[11px] text-slate-300 font-normal leading-relaxed text-left">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
