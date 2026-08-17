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
  danger: <AlertTriangle className="w-6 h-6 text-red-600" />,
  warning: <AlertTriangle className="w-6 h-6 text-amber-600" />,
  info: <Info className="w-6 h-6 text-indigo-600" />,
  success: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
};

const VARIANT_ICON_BG = {
  danger: "bg-red-50 border-red-100",
  warning: "bg-amber-50 border-amber-100",
  info: "bg-indigo-50 border-indigo-100",
  success: "bg-emerald-50 border-emerald-100",
};

const VARIANT_BUTTONS = {
  danger: "bg-red-600 hover:bg-red-700 text-white shadow-xs focus:ring-red-500",
  warning: "bg-amber-600 hover:bg-amber-700 text-white shadow-xs focus:ring-amber-500",
  info: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs focus:ring-indigo-500",
  success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs focus:ring-emerald-500",
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
          className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${VARIANT_ICON_BG[variant]}`}
        >
          {VARIANT_ICONS[variant]}
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            {description}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 w-full pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer inline-flex items-center justify-center gap-2 ${VARIANT_BUTTONS[variant]}`}
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
