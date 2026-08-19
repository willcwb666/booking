"use client";

import React, { useState, useEffect } from "react";
import { NotificationBell } from "./notification-bell";

const TOUR_STEPS = [
  {
    step: 1,
    title: "1. Agenda & Horários",
    description: "Visualize seus atendimentos diários, controle horários disponíveis e bloqueios de profissionais em um só lugar.",
    icon: "📅",
  },
  {
    step: 2,
    title: "2. Novo Agendamento Direto",
    description: "Agende atendimentos manualmente para clientes presenciais ou por telefone rapidamente.",
    icon: "⚡",
  },
  {
    step: 3,
    title: "3. Catálogo de Serviços & Preços",
    description: "Cadastre seus serviços, duração e adicione extras para personalização no checkout público.",
    icon: "✂️",
  },
  {
    step: 4,
    title: "4. Programa de Fidelidade & Promoções",
    description: "Crie campanhas de desconto e ofereça acúmulo automático de pontos para reter seus clientes recorrentes.",
    icon: "🎁",
  },
  {
    step: 5,
    title: "5. Link Público & Customização",
    description: "Personalize sua Landing Page com as cores da sua marca e compartilhe seu link exclusivo de agendamento 24/7.",
    icon: "🌐",
  },
  {
    step: 6,
    title: "6. Gestão Financeira & Métricas",
    description: "Acompanhe faturamento, recebimentos online via Stripe/PIX e desempenho da sua equipe.",
    icon: "📊",
  },
];

export function GuidedTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Abre automaticamente apenas no primeiro acesso do usuário
    const hasSeenTour = localStorage.getItem("kreator_tour_seen");
    if (!hasSeenTour) {
      setIsOpen(true);
    }
  }, []);

  function handleClose() {
    setIsOpen(false);
    localStorage.setItem("kreator_tour_seen", "true");
  }

  function handleNext() {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleClose();
    }
  }

  function handlePrev() {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }

  function openTour() {
    setCurrentStep(0);
    setIsOpen(true);
  }

  const activeStep = TOUR_STEPS[currentStep];

  return (
    <>
      {/* Barra de Ferramentas do Topo (Notificações + Dicas) */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        <NotificationBell />
        <button
          type="button"
          onClick={openTour}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-navy)] hover:bg-[var(--color-navy)] text-white rounded-full text-xs font-bold shadow-md transition-all cursor-pointer"
          title="Dúvidas? Clique para ver o Guia do Sistema"
        >
          <span className="bg-[var(--color-warning)] text-[var(--color-text-heading)] w-4 h-4 rounded-full flex items-center justify-center font-semibold text-[var(--text-2xs)]">
            ?
          </span>
          <span>Dicas</span>
        </button>
      </div>

      {/* Modal / Balão do Tour Guiado */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-navy)] backdrop-blur-xs animate-fadeIn">
          <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-6 text-left">
            {/* Header do Balão */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{activeStep.icon}</span>
                <div>
                  <span className="text-[var(--text-2xs)] font-semibold text-[var(--color-warning)] uppercase tracking-wider block">
                    Dica {activeStep.step} de {TOUR_STEPS.length}
                  </span>
                  <h3 className="text-base font-bold text-[var(--color-text-heading)]">{activeStep.title}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-[var(--color-text-subtle)] hover:text-[var(--color-text)] text-lg font-bold p-1 rounded-[var(--radius-control)] transition-colors cursor-pointer"
                title="Pular Tutorial"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo da Dica */}
            <div className="space-y-3">
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{activeStep.description}</p>
            </div>

            {/* Progresso visual */}
            <div className="flex gap-1.5 justify-center py-2">
              {TOUR_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep ? "w-6 bg-[var(--color-warning)]" : "w-1.5 bg-[var(--color-bg-muted)]"
                  }`}
                />
              ))}
            </div>

            {/* Botões de Navegação */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="px-4 py-2 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-30 cursor-pointer"
              >
                Anterior
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 bg-[var(--color-warning)] hover:bg-[var(--color-warning)] text-white font-bold text-xs rounded-[var(--radius-control)] shadow-md transition-all cursor-pointer"
              >
                {currentStep === TOUR_STEPS.length - 1 ? "Concluir Guia" : "Próximo ▸"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
