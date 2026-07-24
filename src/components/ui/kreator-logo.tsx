import React from "react";

export function KreatorIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <rect width="32" height="32" rx="9" fill="url(#kreator-grad)" />
      <path d="M10 7.5V24.5" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M22.5 8L10.5 16L22.5 24" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="kreator-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C3AED" />
          <stop offset="0.5" stopColor="#4F46E5" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function KreatorLogo({
  size = 32,
  textClassName = "text-xl font-bold text-gray-900",
  className = "",
}: {
  size?: number;
  textClassName?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <KreatorIcon size={size} />
      <span className={`tracking-tight font-sans ${textClassName}`}>
        kreator<span className="text-violet-600">.</span>
      </span>
    </div>
  );
}
