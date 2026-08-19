"use client";

import React, { useState } from "react";

interface ActionTooltipProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function ActionTooltip({
  label,
  description,
  children,
  position = "top",
  className = "",
}: ActionTooltipProps) {
  const [visible, setVisible] = useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={`absolute z-[9999] pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95 ${positionClasses[position]}`}
        >
          <div className="bg-[var(--color-navy)] text-white text-xs rounded-[var(--radius-control)] px-3 py-1.5 shadow-2xl backdrop-blur-md border border-[var(--color-navy)] max-w-xs whitespace-normal text-center select-none space-y-0.5">
            <p className="font-bold tracking-tight text-[var(--text-2xs)] text-white leading-tight">
              {label}
            </p>
            {description && (
              <p className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] font-normal leading-snug">
                {description}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
