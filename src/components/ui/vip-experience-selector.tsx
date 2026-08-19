"use client";

import React, { useState } from "react";
import { Sparkles, CheckCircle2 } from "@/components/ui/icons";
import {
  type VIPCustomerPreferences,
  type ConversationMode,
  type WelcomeDrink,
  type SensitivityMode,
  CONVERSATION_MODE_LABELS,
  WELCOME_DRINK_LABELS,
  SENSITIVITY_LABELS,
} from "@/lib/experience/vip-preferences";

type Props = {
  initialPreferences?: Partial<VIPCustomerPreferences>;
  onChange?: (preferences: VIPCustomerPreferences) => void;
};

export function VIPExperienceSelector({ initialPreferences, onChange }: Props) {
  const [conversationMode, setConversationMode] = useState<ConversationMode>(
    initialPreferences?.conversationMode || "NORMAL"
  );
  const [welcomeDrink, setWelcomeDrink] = useState<WelcomeDrink>(
    initialPreferences?.welcomeDrink || "NONE"
  );
  const [sensitivityMode, setSensitivityMode] = useState<SensitivityMode>(
    initialPreferences?.sensitivityMode || "NORMAL"
  );
  const [customObservation, setCustomObservation] = useState<string>(
    initialPreferences?.customObservation || ""
  );

  const updatePreferences = (
    cMode: ConversationMode,
    drink: WelcomeDrink,
    sens: SensitivityMode,
    obs: string
  ) => {
    if (onChange) {
      onChange({
        conversationMode: cMode,
        welcomeDrink: drink,
        sensitivityMode: sens,
        customObservation: obs,
      });
    }
  };

  return (
    <div className="bg-white border border-[var(--color-border)]/90 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs card-tactile text-left">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--color-success)]" />
          <h3 className="text-sm font-black text-[var(--color-text-heading)]">Personalize seu Atendimento VIP</h3>
        </div>
        <span className="text-[10px] font-bold text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] px-2 py-0.5 rounded-full">
          Opcional · 1 Toque
        </span>
      </div>

      {/* 1. Modo de Conversa */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-[var(--color-text-muted)] block">
          Preferência de Conversa:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(Object.keys(CONVERSATION_MODE_LABELS) as ConversationMode[]).map((key) => {
            const item = CONVERSATION_MODE_LABELS[key];
            const isSelected = conversationMode === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setConversationMode(key);
                  updatePreferences(key, welcomeDrink, sensitivityMode, customObservation);
                }}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[var(--color-navy)] text-white border-[var(--color-border-strong)] shadow-xs ring-1 ring-[var(--color-border-strong)]"
                    : "bg-[var(--color-bg-subtle)] text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base">{item.icon}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)]" />}
                </div>
                <p className="text-xs font-black">{item.title}</p>
                <p className={`text-[10px] mt-0.5 ${isSelected ? "text-[var(--color-text-subtle)]" : "text-[var(--color-text-muted)]"}`}>
                  {item.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Bebida de Boas-Vindas */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-[var(--color-text-muted)] block">
          Bebida de Boas-Vindas na Recepção:
        </label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(WELCOME_DRINK_LABELS) as WelcomeDrink[]).map((key) => {
            const item = WELCOME_DRINK_LABELS[key];
            const isSelected = welcomeDrink === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setWelcomeDrink(key);
                  updatePreferences(conversationMode, key, sensitivityMode, customObservation);
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[var(--color-success)] text-white border-[var(--color-success)] shadow-2xs"
                    : "bg-[var(--color-bg-subtle)] text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Cuidados & Sensibilidade */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-[var(--color-text-muted)] block">
          Cuidados Especiais:
        </label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SENSITIVITY_LABELS) as SensitivityMode[]).map((key) => {
            const item = SENSITIVITY_LABELS[key];
            const isSelected = sensitivityMode === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSensitivityMode(key);
                  updatePreferences(conversationMode, welcomeDrink, key, customObservation);
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[var(--color-navy)] text-white border-[var(--color-border-strong)] shadow-2xs"
                    : "bg-[var(--color-bg-subtle)] text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
