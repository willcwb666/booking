"use client";

import React, { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "invisible" | "flexible";
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

type TurnstileProps = {
  onVerify: (token: string) => void;
  siteKey?: string;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "invisible" | "flexible";
};

export function CloudflareTurnstile({
  onVerify,
  siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  theme = "auto",
  size = "flexible",
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    // Injeta o script oficial do Turnstile se ainda não existir na página
    const scriptId = "cf-turnstile-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    function renderWidget() {
      if (window.turnstile && containerRef.current && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey!,
          callback: onVerify,
          theme,
        });
      }
    }

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    } else if (window.turnstile) {
      renderWidget();
    }
  }, [siteKey, onVerify, theme]);

  if (!siteKey) return null;

  return <div ref={containerRef} className="my-2 flex justify-center" />;
}
