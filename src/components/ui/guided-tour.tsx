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
          className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-full text-xs font-bold shadow-md transition-all cursor-pointer"
          title="Dúvidas? Clique para ver o Guia do Sistema"
        >
          <span className="bg-amber-500 text-stone-900 w-4 h-4 rounded-full flex items-center justify-center font-black text-[10px]">
            ?
          </span>
          <span>Dicas</span>
        </button>
      </div>

      {/* Modal / Balão do Tour Guiado */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-6 text-left">
            {/* Header do Balão */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{activeStep.icon}</span>
                <div>
                  <span className="text-[11px] font-black text-amber-600 uppercase tracking-wider block">
                    Dica {activeStep.step} de {TOUR_STEPS.length}
                  </span>
                  <h3 className="text-base font-bold text-stone-900">{activeStep.title}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-stone-400 hover:text-stone-700 text-lg font-bold p-1 rounded-lg transition-colors cursor-pointer"
                title="Pular Tutorial"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo da Dica */}
            <div className="space-y-3">
              <p className="text-xs text-stone-600 leading-relaxed">{activeStep.description}</p>
            </div>

            {/* Progresso visual */}
            <div className="flex gap-1.5 justify-center py-2">
              {TOUR_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep ? "w-6 bg-amber-500" : "w-1.5 bg-stone-200"
                  }`}
                />
              ))}
            </div>

            {/* Botões de Navegação */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="px-4 py-2 text-xs font-bold text-stone-500 hover:text-stone-800 disabled:opacity-30 cursor-pointer"
              >
                Anterior
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
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
