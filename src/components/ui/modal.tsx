"use client";

import React, { useCallback, useEffect, useId, useRef } from "react";
import { X } from "@/components/ui/icons";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  closeOnOverlayClick?: boolean;
}

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  full: "max-w-4xl",
};

/**
 * Diálogo modal.
 *
 * Detalhes que o usuário não nota conscientemente, e que são justamente o
 * ponto:
 *
 *  · A caixa entra de `scale(0.96)`, nunca de `scale(0)` — nada no mundo real
 *    aparece a partir do nada.
 *  · `transform-origin` fica no centro. Modal é a exceção da regra de origem:
 *    ele não está ancorado a um gatilho, aparece no meio da tela.
 *  · O foco entra no diálogo, circula dentro dele (Tab e Shift+Tab) e volta
 *    para quem abriu ao fechar. Sem isso, o Tab escapa para a página atrás e o
 *    usuário de teclado se perde.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnOverlayClick = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  const focusables = useCallback(() => {
    if (!panelRef.current) return [] as HTMLElement[];
    return Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Foca o primeiro elemento útil; se não houver, o próprio painel
    const first = focusables()[0];
    (first ?? panelRef.current)?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === firstEl || !panelRef.current?.contains(active))) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown, true);
      restoreFocusRef.current?.focus?.();
    };
  }, [isOpen, onClose, focusables]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      style={{
        zIndex: "var(--z-modal)",
        background: "rgba(11, 15, 22, 0.55)",
        backdropFilter: "blur(2px)",
        animation: "fade-in var(--dur-fast) var(--ease-out)",
      }}
      onClick={() => closeOnOverlayClick && onClose()}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        className={`w-full ${SIZE_CLASSES[size]} card card-lg overflow-hidden outline-none`}
        style={{
          boxShadow: "var(--shadow-xl)",
          animation: "pop-in var(--dur-base) var(--ease-out)",
          transformOrigin: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description) && (
          <div className="card-header items-start">
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="card-title">
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id={descId}
                  className="text-[var(--color-text-muted)] mt-1"
                  style={{ fontSize: "var(--text-sm)" }}
                >
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-icon btn-sm shrink-0"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="card-body">{children}</div>

        {footer && (
          <div className="card-footer flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
