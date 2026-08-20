"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogoUpload } from "@/components/ui/logo-upload";
import {
  MARKETS,
  detectUserMarket,
  findMarketByDialCode,
  formatPhoneNumber,
} from "@/lib/markets";
import { createCompanyWizardAction, type WizardPayload } from "@/server/actions/company";
import { toast } from "@/lib/toast-service";

/** Forma de um preset como a rota `/api/presets` o devolve. */
type PresetApiRow = {
  id: string;
  title: string;
  description?: string | null;
  defaultPrice: number | string;
  durationMin: number;
  isExtra?: boolean;
  parentTitle?: string | null;
};

type PlanItem = {
  id: string;
  tier: string;
  displayName: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
};

type PresetService = {
  id: string;
  title: string;
  description: string | null;
  defaultPrice: number;
  durationMin: number;
  isExtra: boolean;
  parentTitle: string | null;
  selected: boolean;
  customPrice: number;
  customDuration: number;
};

const BUSINESS_TYPES = [
  { value: "MECHANIC", label: "🛠️ Oficina Mecânica & Auto" },
  { value: "BARBER", label: "💈 Barbearia" },
  { value: "HOME_CLEANING", label: "🧹 Limpeza Residencial & Faxina" },
  { value: "PET_GROOMER", label: "🐶 Pet Shop & Groomer" },
  { value: "HAIR_SALON", label: "💅 Salão de Beleza & Estética" },
  { value: "CAR_WASH", label: "🚗 Lava-Rápido & Estética Automotiva" },
  { value: "LAWN_CARE", label: "🌿 Jardinagem & Paisagismo" },
  { value: "POOL_CLEANING", label: "🏊 Limpeza de Piscinas" },
  { value: "PHOTOGRAPHER", label: "📷 Fotografia & Eventos" },
  { value: "OTHER", label: "⚙️ Outro Prestador de Serviços" },
];

const DAYS_OF_WEEK = [
  { day: 1, label: "Seg" },
  { day: 2, label: "Ter" },
  { day: 3, label: "Qua" },
  { day: 4, label: "Qui" },
  { day: 5, label: "Sex" },
  { day: 6, label: "Sáb" },
  { day: 0, label: "Dom" },
];

export function OnboardingWizardClient({
  plans,
  userName,
  isAdditionalCompany = false,
  multiCompanyEnabled = false,
}: {
  plans: PlanItem[];
  userName: string;
  isAdditionalCompany?: boolean;
  multiCompanyEnabled?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Step 1 State ──
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("MECHANIC");
  const [planId, setPlanId] = useState(plans[0]?.id || "");
  const [phone, setPhone] = useState("");
  const [isWhatsapp, setIsWhatsapp] = useState(true);
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("BR");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [enableMultiCompany, setEnableMultiCompany] = useState(false);
  const [setupMode, setSetupMode] = useState<"STANDARD" | "CUSTOM">("STANDARD");

  // ── Step 2 State (Schedule) ──
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");
  const [intervalMinutes, setIntervalMinutes] = useState(30);

  // ── Step 3 State (Presets) ──
  const [presets, setPresets] = useState<PresetService[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);

  // ── Dynamic Segments ──
  const [segmentsList, setSegmentsList] = useState<Array<{ value: string; label: string }>>(BUSINESS_TYPES);

  // ── Auto-Detect User Market & Timezone from Browser ──
  useEffect(() => {
    const { market, timezoneId } = detectUserMarket();
    if (market) {
      setCountry(market.code);
      setTimezone(timezoneId);
    }
  }, []);

  /**
   * O telefone corrige o palpite do navegador.
   *
   * `detectUserMarket()` acerta na maioria das vezes, mas erra justamente em
   * quem mais precisa: o dono brasileiro abrindo a conta em viagem, o notebook
   * comprado nos EUA com `en-US` de fábrica, qualquer VPN. O número do negócio
   * é o sinal mais forte de onde o negócio opera.
   *
   * Só age quando a pessoa digita ou cola um número COM `+`. Sem isso é um
   * número nacional, que não carrega país — trocar a moeda por causa de um DDD
   * seria pior que não inferir nada.
   *
   * E não sobrescreve o fuso já escolhido se ele continuar válido no mercado
   * novo: quem selecionou "Denver" à mão não volta para "New York" por ter
   * digitado o telefone depois.
   */
  function handlePhoneChange(raw: string) {
    const inferred = findMarketByDialCode(raw, country);

    if (inferred && inferred.code !== country) {
      setCountry(inferred.code);
      setTimezone((current) =>
        inferred.timezones.some((t) => t.id === current) ? current : inferred.timezones[0].id
      );
      // O DDI já virou o prefixo à esquerda do campo; deixá-lo no valor
      // digitado o mostraria duas vezes.
      const national = raw.trim().slice(1).replace(/\D/g, "").slice(inferred.dialCode.length - 1);
      setPhone(formatPhoneNumber(national, inferred.code));
      return;
    }

    setPhone(formatPhoneNumber(raw, inferred?.code ?? country));
  }

  useEffect(() => {
    async function loadSegments() {
      try {
        const res = await fetch("/api/segments?active=true");
        if (res.ok) {
          const data = await res.json();
          if (data.segments && data.segments.length > 0) {
            const mapped = data.segments.map((s: { code: string; label: string }) => ({
              value: s.code,
              label: s.label,
            }));
            setSegmentsList(mapped);
            setBusinessType((prev) => mapped.some((m: { value: string }) => m.value === prev) ? prev : mapped[0].value);
          }
        }
      } catch {
        // usa fallback padrão
      }
    }
    loadSegments();
  }, []);

  const selectedMarket = MARKETS.find((m) => m.code === country) || MARKETS[0];

  // Fetch Presets when entering Step 3 or when businessType changes
  useEffect(() => {
    async function loadPresets() {
      setLoadingPresets(true);
      try {
        const res = await fetch(`/api/presets?businessType=${businessType}`);
        if (res.ok) {
          const data = await res.json();
          const items: PresetService[] = (data.presets || []).map((p: PresetApiRow) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            defaultPrice: Number(p.defaultPrice),
            durationMin: p.durationMin,
            isExtra: p.isExtra,
            parentTitle: p.parentTitle,
            selected: true, // Pré-selecionados por padrão!
            customPrice: Number(p.defaultPrice),
            customDuration: p.durationMin,
          }));
          setPresets(items);
        }
      } catch {
        // Fallback silencioso
      } finally {
        setLoadingPresets(false);
      }
    }

    loadPresets();
  }, [businessType]);

  function handleToggleDay(day: number) {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  function handleTogglePresetSelected(id: string) {
    setPresets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  }

  function handleUpdatePresetPrice(id: string, newPrice: number) {
    setPresets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, customPrice: newPrice } : p))
    );
  }

  function handleUpdatePresetDuration(id: string, newDuration: number) {
    setPresets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, customDuration: newDuration } : p))
    );
  }

  function handleGoToStep2(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!name.trim() || name.length < 2) {
      setErrorMsg("Digite o nome da empresa (mínimo 2 caracteres).");
      return;
    }

    if (setupMode === "STANDARD") {
      handleFinalizeStandard();
      return;
    }

    setStep(2);
  }

  function handleGoToStep3(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (workingDays.length === 0) {
      setErrorMsg("Selecione pelo menos 1 dia de atendimento.");
      return;
    }
    setStep(3);
  }

  async function handleFinalizeStandard() {
    if (isSubmitting || isPending) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    let activePresets = presets;
    if (activePresets.length === 0) {
      try {
        const res = await fetch(`/api/presets?businessType=${businessType}`);
        if (res.ok) {
          const data = await res.json();
          activePresets = (data.presets || []).map((p: PresetApiRow) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            defaultPrice: Number(p.defaultPrice),
            durationMin: p.durationMin,
            isExtra: p.isExtra,
            parentTitle: p.parentTitle,
            selected: true,
            customPrice: Number(p.defaultPrice),
            customDuration: p.durationMin,
          }));
        }
      } catch {}
    }

    const mainServices = activePresets.filter((p) => !p.isExtra);
    const extraServices = activePresets.filter((p) => p.isExtra);

    const payload: WizardPayload = {
      name,
      businessType,
      planId,
      phone: phone || undefined,
      address: address || undefined,
      logoUrl: logoUrl || undefined,
      country,
      timezone,
      enableMultiCompany,
      workingDays: [1, 2, 3, 4, 5, 6],
      startTime: "09:00",
      endTime: "19:00",
      intervalMinutes: 30,
      selectedServices: mainServices.length > 0 ? mainServices.map((m) => ({
        title: m.title,
        description: m.description || undefined,
        price: m.customPrice,
        durationMin: m.customDuration,
        isExtra: false,
        extras: extraServices
          .filter((ex) => !ex.parentTitle || ex.parentTitle === m.title)
          .map((ex) => ({
            title: ex.title,
            description: ex.description || undefined,
            price: ex.customPrice,
            durationMin: ex.customDuration,
          })),
      })) : [
        {
          title: "Atendimento Principal",
          price: 50,
          durationMin: 30,
          isExtra: false,
        }
      ],
    };

    startTransition(async () => {
      toast.help("Criando Empresa...", "Configurando o catálogo padrão e ativando o link de agendamento.");
      const res = await createCompanyWizardAction(payload);
      if (res.success && res.companySlug) {
        toast.success("Empresa Criada!", "Sua empresa foi cadastrada com sucesso.");
        if (res.checkoutUrl) {
          window.location.href = res.checkoutUrl;
        } else {
          router.push(`/${res.companySlug}/dashboard`);
        }
      } else {
        toast.error("Erro no Cadastro", res.error || "Erro ao criar empresa. Tente novamente.");
        setErrorMsg(res.error || "Erro ao criar empresa. Tente novamente.");
        setIsSubmitting(false);
      }
    });
  }

  async function handleFinalizeWizard() {
    if (isSubmitting || isPending) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    const activeSelectedPresets = presets.filter((p) => p.selected);

    if (activeSelectedPresets.length === 0) {
      setErrorMsg("Selecione pelo menos 1 serviço para a sua empresa.");
      setIsSubmitting(false);
      return;
    }

    // Organizar principais e extras
    const mainServices = activeSelectedPresets.filter((p) => !p.isExtra);
    const extraServices = activeSelectedPresets.filter((p) => p.isExtra);

    const payload: WizardPayload = {
      name,
      businessType,
      planId,
      phone: phone || undefined,
      address: address || undefined,
      logoUrl: logoUrl || undefined,
      country,
      timezone,
      enableMultiCompany,
      workingDays,
      startTime,
      endTime,
      intervalMinutes,
      selectedServices: mainServices.map((m) => ({
        title: m.title,
        description: m.description || undefined,
        price: m.customPrice,
        durationMin: m.customDuration,
        isExtra: false,
        extras: extraServices
          .filter((ex) => !ex.parentTitle || ex.parentTitle === m.title)
          .map((ex) => ({
            title: ex.title,
            description: ex.description || undefined,
            price: ex.customPrice,
            durationMin: ex.customDuration,
          })),
      })),
    };

    startTransition(async () => {
      toast.help("Criando Empresa...", "Configurando o catálogo de serviços e publicando o link de agendamento.");
      const res = await createCompanyWizardAction(payload);
      if (res.success && res.companySlug) {
        toast.success("Empresa Criada!", "Sua empresa foi cadastrada com sucesso.");
        if (res.checkoutUrl) {
          window.location.href = res.checkoutUrl;
        } else {
          router.push(`/${res.companySlug}/dashboard`);
        }
      } else {
        toast.error("Erro no Cadastro", res.error || "Erro ao criar empresa. Tente novamente.");
        setErrorMsg(res.error || "Erro ao criar empresa. Tente novamente.");
        setIsSubmitting(false);
      }
    });
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)] flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="max-w-2xl w-full bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] shadow-xl p-6 sm:p-10 space-y-8">
        
        {/* Wizard Header & Progress Bar */}
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--color-text-subtle)] uppercase tracking-wider px-2">
            <span>Passo {step} de 3</span>
            <span>
              {step === 1 && "1. Dados da Empresa"}
              {step === 2 && "2. Agenda & Horários"}
              {step === 3 && "3. Serviços do Nicho"}
            </span>
          </div>

          <div className="w-full bg-[var(--color-bg-muted)] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[var(--color-navy)] h-full transition-all duration-300 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-danger-light)] border border-[var(--color-danger-border)] text-xs font-bold text-[var(--color-danger)]">
            {errorMsg}
          </div>
        )}

        {/* ── PASSO 1: DADOS DA EMPRESA & NICHO ── */}
        {step === 1 && (
          <form onSubmit={handleGoToStep2} className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--color-text-heading)]">
                {isAdditionalCompany ? "Cadastrar Nova Empresa" : `Bem-vindo, ${userName}!`}
              </h2>
              <p className="text-sm text-[var(--color-text-muted)] font-medium mt-1">
                Informe os dados básicos para gerar a página pública da sua marca.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] uppercase mb-1">
                  Nome da Empresa / Estabelecimento *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: AutoFix Oficina Mecânica ou Barbearia Don Corleone"
                  className="w-full px-4 py-3 rounded-[var(--radius-control)] border border-[var(--color-border-strong)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] uppercase mb-1">
                  Segmento de Atuação (Nicho) *
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-4 py-3 rounded-[var(--radius-control)] border border-[var(--color-border-strong)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]"
                >
                  {segmentsList.map((bt) => (
                    <option key={bt.value} value={bt.value}>
                      {bt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text)] uppercase mb-1">
                    Telefone / Celular
                  </label>
                  <div className="flex items-center">
                    <span className="px-3.5 py-3 rounded-l-xl bg-[var(--color-bg-muted)] border border-r-0 border-[var(--color-border-strong)] text-xs font-bold text-[var(--color-text)] select-none">
                      {selectedMarket.dialCode}
                    </span>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder={selectedMarket.phonePlaceholder}
                      className="w-full px-4 py-3 rounded-r-xl border border-[var(--color-border-strong)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]"
                    />
                  </div>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isWhatsapp}
                      onChange={(e) => setIsWhatsapp(e.target.checked)}
                      className="w-4 h-4 rounded border-[var(--color-border-strong)] text-[var(--color-success)] focus:ring-[var(--color-success)]"
                    />
                    <span className="text-xs font-medium text-[var(--color-text-muted)]">Este número tem WhatsApp</span>
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text)] uppercase mb-1">
                    Endereço / Cidade
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ex: Av. Paulista, 1000 - São Paulo"
                    className="w-full px-4 py-3 rounded-[var(--radius-control)] border border-[var(--color-border-strong)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]"
                  />
                </div>
              </div>

              {/* Logo Upload Component */}
              <div className="pt-2">
                <LogoUpload
                  name="logoUrl"
                  initialUrl={logoUrl}
                  label="Logo da Empresa (Opcional)"
                />
              </div>

              <div className="pt-2 grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text)] uppercase mb-1">País</label>
                  <select
                    value={country}
                    onChange={(e) => {
                      setCountry(e.target.value);
                      const m = MARKETS.find((mk) => mk.code === e.target.value);
                      if (m) setTimezone(m.timezones[0].id);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-[var(--radius-control)] border border-[var(--color-border-strong)] text-xs font-semibold"
                  >
                    {MARKETS.map((m) => (
                      <option key={m.code} value={m.code}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text)] uppercase mb-1">Fuso Horário</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[var(--radius-control)] border border-[var(--color-border-strong)] text-xs font-semibold"
                  >
                    {selectedMarket.timezones.map((tz) => (
                      <option key={tz.id} value={tz.id}>{tz.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── SELETOR DE MODO DE CONFIGURAÇÃO ── */}
              <div className="pt-3 space-y-2 border-t border-[var(--color-border)]">
                <label className="block text-xs font-bold text-[var(--color-text)] uppercase">
                  Como deseja começar?
                </label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {/* Card Padrão Recomendado */}
                  <div
                    onClick={() => setSetupMode("STANDARD")}
                    className={`p-4 rounded-[var(--radius-card)] border-2 transition-all cursor-pointer text-left relative ${
                      setupMode === "STANDARD"
                        ? "border-[var(--color-success-border)] bg-[var(--color-success-light)] shadow-xs"
                        : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-border-strong)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--color-text-heading)] flex items-center gap-1.5">
                        ⚡ Configuração Padrão
                      </span>
                      <span className="px-2 py-0.5 bg-[var(--color-success)] text-white rounded-full text-[var(--text-2xs)] font-semibold uppercase tracking-wider">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] font-medium mt-2 leading-relaxed">
                      Criamos automaticamente seu catálogo de serviços de {segmentsList.find((s) => s.value === businessType)?.label || "seu segmento"}, grade comercial (Seg a Sáb) e link de agendamento online pronto para uso em segundos. Você pode mudar tudo depois.
                    </p>
                  </div>

                  {/* Card Personalizado */}
                  <div
                    onClick={() => setSetupMode("CUSTOM")}
                    className={`p-4 rounded-[var(--radius-card)] border-2 transition-all cursor-pointer text-left relative ${
                      setupMode === "CUSTOM"
                        ? "border-[var(--color-navy)] bg-[var(--color-bg-subtle)] shadow-xs"
                        : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-border-strong)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--color-text-heading)] flex items-center gap-1.5">
                        🛠️ Personalizada
                      </span>
                      <span className="px-2 py-0.5 bg-[var(--color-bg-muted)] text-[var(--color-text)] rounded-full text-[var(--text-2xs)] font-bold uppercase tracking-wider">
                        Passo a Passo
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] font-medium mt-2 leading-relaxed">
                      Permite ajustar manualmente os dias de atendimento, horários de abertura/fechamento, selecionar quais serviços incluir e definir preços antes de entrar no painel.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || isPending}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-[var(--radius-control)] font-bold text-sm transition-all shadow-md ${
                  setupMode === "STANDARD"
                    ? "bg-[var(--color-success)] hover:bg-[var(--color-success)] text-white"
                    : "bg-[var(--color-navy)] hover:bg-[var(--color-navy)] text-white"
                }`}
              >
                {isSubmitting || isPending
                  ? "Configurando..."
                  : setupMode === "STANDARD"
                  ? "🚀 Concluir Cadastro em 1 Clique"
                  : "Continuar: Personalizar Horários & Serviços →"}
              </button>
            </div>
          </form>
        )}

        {/* ── PASSO 2: CONFIGURAÇÃO DA AGENDA ── */}
        {step === 2 && (
          <form onSubmit={handleGoToStep3} className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--color-text-heading)]">Agenda & Horários de Atendimento</h2>
              <p className="text-sm text-[var(--color-text-muted)] font-medium mt-1">
                Defina em quais dias e horários sua empresa estará aberta para agendamentos.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] uppercase mb-2">
                  Dias de Funcionamento
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = workingDays.includes(d.day);
                    return (
                      <button
                        key={d.day}
                        type="button"
                        onClick={() => handleToggleDay(d.day)}
                        className={`px-4 py-2.5 rounded-[var(--radius-control)] text-xs font-bold transition-all border ${
                          isSelected
                            ? "bg-[var(--color-navy)] text-white border-[var(--color-navy)] shadow-sm"
                            : "bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-bg-muted)]"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text)] uppercase mb-1">
                    Horário de Abertura
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-[var(--radius-control)] border border-[var(--color-border-strong)] text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text)] uppercase mb-1">
                    Horário de Fechamento
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-[var(--radius-control)] border border-[var(--color-border-strong)] text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] uppercase mb-1">
                  Duração Média por Atendimento / Slot
                </label>
                <select
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-[var(--radius-control)] border border-[var(--color-border-strong)] text-sm font-semibold"
                >
                  <option value={15}>15 Minutos</option>
                  <option value={30}>30 Minutos (Padrão)</option>
                  <option value={45}>45 Minutos</option>
                  <option value={60}>60 Minutos (1 Hora)</option>
                  <option value={90}>90 Minutos (1h 30m)</option>
                  <option value={120}>120 Minutos (2 Horas)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-3.5 text-xs font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] rounded-[var(--radius-control)]"
              >
                ← Voltar
              </button>
              <button
                type="submit"
                className="px-8 py-3.5 rounded-[var(--radius-control)] bg-[var(--color-navy)] text-white font-bold text-sm hover:bg-[var(--color-navy)] transition-all shadow-md"
              >
                Próximo: Escolher Serviços →
              </button>
            </div>
          </form>
        )}

        {/* ── PASSO 3: SERVIÇOS DO NICHO & CRIAÇÃO EM 1 CLIQUE ── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--color-text-heading)]">Serviços do Seu Segmento</h2>
              <p className="text-sm text-[var(--color-text-muted)] font-medium mt-1">
                Encontramos esses serviços sugeridos para o seu nicho. Ajuste os preços se desejar e clique em criar!
              </p>
            </div>

            {loadingPresets ? (
              <div className="py-12 text-center text-sm font-bold text-[var(--color-text-subtle)]">
                Carregando modelo de serviços...
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className={`p-4 rounded-[var(--radius-card)] border transition-all ${
                      preset.selected
                        ? "bg-[var(--color-bg)] border-[var(--color-navy)] shadow-sm"
                        : "bg-[var(--color-bg-subtle)] border-[var(--color-border)] opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={preset.selected}
                          onChange={() => handleTogglePresetSelected(preset.id)}
                          className="mt-1 w-5 h-5 rounded text-[var(--color-text-heading)] focus:ring-[var(--color-navy)] cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--color-text-heading)] text-sm">{preset.title}</span>
                            {preset.isExtra && (
                              <span className="text-[var(--text-2xs)] bg-[var(--color-primary-light)] text-[var(--color-primary)] font-bold px-2 py-0.5 rounded">
                                EXTRA
                              </span>
                            )}
                          </div>
                          {preset.description && (
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{preset.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Custom Price & Duration */}
                      {preset.selected && (
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-24">
                            <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] block font-bold">PREÇO (R$)</span>
                            <input
                              type="number"
                              step="0.01"
                              value={preset.customPrice}
                              onChange={(e) => handleUpdatePresetPrice(preset.id, parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-xs font-bold border border-[var(--color-border-strong)] rounded-[var(--radius-control)]"
                            />
                          </div>
                          <div className="w-20">
                            <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] block font-bold">MINUTOS</span>
                            <input
                              type="number"
                              value={preset.customDuration}
                              onChange={(e) => handleUpdatePresetDuration(preset.id, parseInt(e.target.value) || 15)}
                              className="w-full px-2 py-1 text-xs font-bold border border-[var(--color-border-strong)] rounded-[var(--radius-control)]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 flex items-center justify-between gap-4 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3.5 text-xs font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] rounded-[var(--radius-control)]"
              >
                ← Voltar
              </button>
              <button
                type="button"
                onClick={handleFinalizeWizard}
                disabled={isPending}
                className="px-8 py-4 rounded-[var(--radius-control)] bg-[var(--color-success)] text-white font-semibold text-sm hover:bg-[var(--color-success)] transition-all shadow-lg hover:scale-105 disabled:opacity-50"
              >
                {isPending ? "Criando Sua Empresa..." : "✨ Criar Minha Empresa com 1 Clique"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
