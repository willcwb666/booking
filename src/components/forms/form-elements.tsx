"use client";

import React, { useId } from "react";

export interface FormFieldProps {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  description,
  error,
  required,
  children,
  className = "",
}: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-bold text-[var(--color-text)]">
        {label}
        {required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
      </label>
      {description && (
        <p className="text-[var(--text-2xs)] text-[var(--color-text-muted)] leading-normal">{description}</p>
      )}
      <div>{children}</div>
      {error && <p className="text-xs text-[var(--color-danger)] font-medium mt-1">{error}</p>}
    </div>
  );
}

export interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className = "", error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full border ${
          error ? "border-[var(--color-danger-border)] focus:ring-[var(--color-danger)]" : "border-[var(--color-border)] focus:ring-[var(--color-primary)]"
        } rounded-[var(--radius-control)] px-3.5 py-2.5 text-xs font-medium text-[var(--color-text-heading)] bg-[var(--color-bg)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:bg-[var(--color-bg-subtle)] disabled:opacity-60 ${className}`}
        {...props}
      />
    );
  }
);
TextInput.displayName = "TextInput";

export interface SelectInputProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const SelectInput = React.forwardRef<HTMLSelectElement, SelectInputProps>(
  ({ className = "", error, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full border ${
          error ? "border-[var(--color-danger-border)] focus:ring-[var(--color-danger)]" : "border-[var(--color-border)] focus:ring-[var(--color-primary)]"
        } rounded-[var(--radius-control)] px-3.5 py-2.5 text-xs font-medium text-[var(--color-text-heading)] bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:bg-[var(--color-bg-subtle)] disabled:opacity-60 ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
SelectInput.displayName = "SelectInput";

export interface TextareaInputProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const TextareaInput = React.forwardRef<HTMLTextAreaElement, TextareaInputProps>(
  ({ className = "", error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full border ${
          error ? "border-[var(--color-danger-border)] focus:ring-[var(--color-danger)]" : "border-[var(--color-border)] focus:ring-[var(--color-primary)]"
        } rounded-[var(--radius-control)] px-3.5 py-2.5 text-xs font-medium text-[var(--color-text-heading)] bg-[var(--color-bg)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:bg-[var(--color-bg-subtle)] disabled:opacity-60 ${className}`}
        {...props}
      />
    );
  }
);
TextareaInput.displayName = "TextareaInput";

export interface SwitchInputProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function SwitchInput({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: SwitchInputProps) {
  const id = useId();

  return (
    <div className="flex items-center justify-between gap-4 py-1">
      {(label || description) && (
        <div className="space-y-0.5">
          {label && (
            <label htmlFor={id} className="text-xs font-bold text-[var(--color-text)] cursor-pointer">
              {label}
            </label>
          )}
          {description && (
            <p className="text-[var(--text-2xs)] text-[var(--color-text-muted)]">{description}</p>
          )}
        </div>
      )}

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50 ${
          checked ? "bg-[var(--color-primary)]" : "bg-[var(--color-bg-muted)]"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--color-bg)] shadow-xs ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
