"use client";

import React, { useState } from "react";

interface ActionTooltipProps {
  label: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export function ActionTooltip({ label, children, position = "top" }: ActionTooltipProps) {
  const [visible, setVisible] = useState(false);

  const positionClasses = {
    top: "-top-8 left-1/2 -translate-x-1/2",
    bottom: "-bottom-8 left-1/2 -translate-x-1/2",
    left: "-left-2 top-1/2 -translate-y-1/2 -translate-x-full",
    right: "-right-2 top-1/2 -translate-y-1/2 translate-x-full",
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          className={`absolute z-50 whitespace-nowrap bg-stone-900 text-white text-[11px] font-semibold px-2 py-1 rounded shadow-lg pointer-events-none transition-all duration-200 ${positionClasses[position]}`}
        >
          {label}
        </span>
      )}
    </div>
  );
}
