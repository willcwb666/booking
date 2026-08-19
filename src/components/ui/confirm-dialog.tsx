"use client";

import React from "react";
import { Modal } from "./modal";
import { AlertTriangle, Info, CheckCircle2 } from "./icons";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info" | "success";
  isLoading?: boolean;
}

const VARIANT_ICONS = {
  danger: <AlertTriangle className="w-6 h-6 text-[var(--color-danger)]" />,
  warning: <AlertTriangle className="w-6 h-6 text-[var(--color-warning)]" />,
  info: <Info className="w-6 h-6 text-[var(--color-primary)]" />,
  success: <CheckCircle2 className="w-6 h-6 text-[var(--color-success)]" />,
};

const VARIANT_ICON_BG = {
  danger: "bg-[var(--color-danger-light)] border-[var(--color-danger-border)]",
  warning: "bg-[var(--color-warning-light)] border-[var(--color-warning-border)]",
  info: "bg-[var(--color-primary-light)] border-[var(--color-primary)]",
  success: "bg-[var(--color-success-light)] border-[var(--color-success-border)]",
};

const VARIANT_BUTTONS = {
  danger: "bg-[var(--color-danger)] hover:bg-[var(--color-danger)] text-white shadow-xs focus:ring-[var(--color-danger)]",
  warning: "bg-[var(--color-warning)] hover:bg-[var(--color-warning)] text-white shadow-xs focus:ring-[var(--color-warning)]",
  info: "bg-[var(--color-primary)] hover:bg-[var(--color-primary)] text-white shadow-xs focus:ring-[var(--color-primary)]",
  success: "bg-[var(--color-success)] hover:bg-[var(--color-success)] text-white shadow-xs focus:ring-[var(--color-success)]",
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger",
  isLoading = false,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center space-y-4 pt-2 pb-2">
        <div
          className={`w-12 h-12 rounded-[var(--radius-card)] flex items-center justify-center border ${VARIANT_ICON_BG[variant]}`}
        >
          {VARIANT_ICONS[variant]}
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-[var(--color-text-heading)] tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed max-w-xs mx-auto">
            {description}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 w-full pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text)] text-xs font-bold rounded-[var(--radius-control)] transition-all disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 text-xs font-bold rounded-[var(--radius-control)] transition-all disabled:opacity-50 cursor-pointer inline-flex items-center justify-center gap-2 ${VARIANT_BUTTONS[variant]}`}
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
