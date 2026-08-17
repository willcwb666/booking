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
      <label className="block text-xs font-bold text-slate-800">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {description && (
        <p className="text-[11px] text-slate-500 leading-normal">{description}</p>
      )}
      <div>{children}</div>
      {error && <p className="text-xs text-red-600 font-medium mt-1">{error}</p>}
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
          error ? "border-red-300 focus:ring-red-500" : "border-slate-200 focus:ring-indigo-500"
        } rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:bg-slate-50 disabled:opacity-60 ${className}`}
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
          error ? "border-red-300 focus:ring-red-500" : "border-slate-200 focus:ring-indigo-500"
        } rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:bg-slate-50 disabled:opacity-60 ${className}`}
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
          error ? "border-red-300 focus:ring-red-500" : "border-slate-200 focus:ring-indigo-500"
        } rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all disabled:bg-slate-50 disabled:opacity-60 ${className}`}
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
            <label htmlFor={id} className="text-xs font-bold text-slate-800 cursor-pointer">
              {label}
            </label>
          )}
          {description && (
            <p className="text-[11px] text-slate-500">{description}</p>
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
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 ${
          checked ? "bg-indigo-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
