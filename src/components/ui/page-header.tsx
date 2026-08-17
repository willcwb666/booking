"use client";

import React from "react";

export interface PageHeaderProps {
  category?: string;
  categoryIcon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  category,
  categoryIcon,
  title,
  description,
  action,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
      <div className="space-y-1">
        {category && (
          <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-xs uppercase tracking-wider">
            {categoryIcon && <span className="shrink-0">{categoryIcon}</span>}
            <span>{category}</span>
          </div>
        )}
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
    </div>
  );
}
