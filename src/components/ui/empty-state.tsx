"use client";

import React from "react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-4 space-y-3 ${className}`}>
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-1">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
