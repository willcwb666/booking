"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";

// ─── Minimalist Modern Icons ────────────────────────────────────────────────
const ArrowRight = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
);

const Check = () => (
  <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);

const Shield = () => (
  <svg className="w-5 h-5 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.8 17 5 19 5a1 1 0 0 1 1 1z"></path></svg>
);

const Sparkles = () => (
  <svg className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"></path></svg>
);

const Calendar = () => (
  <svg className="w-5 h-5 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
);

const FileText = () => (
  <svg className="w-5 h-5 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
);

const Tag = () => (
  <svg className="w-5 h-5 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l11.29 11.29a1 1 0 0 0 1.41 0l7.59-7.59a1 1 0 0 0 0-1.41L12 2z"></path><circle cx="7" cy="7" r="1.5"></circle></svg>
);

const Plus = () => (
  <svg className="w-5 h-5 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

const Store = () => (
  <svg className="w-5 h-5 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"></path><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"></path><path d="M2 7h20"></path></svg>
);

const Globe = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" x2="22" y1="12" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
);

const ChevronDown = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
);

const Menu = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line></svg>
);

const X = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>
);

// ─── Supported Languages Config ─────────────────────────────────────────────
type LangCode = "pt" | "en" | "es" | "it" | "fr" | "de";

const LANGUAGES: Array<{ code: LangCode; label: string; flag: string; countryName: string }> = [
  { code: "pt", label: "PT", flag: "🇧🇷", countryName: "Português" },
  { code: "en", label: "EN", flag: "🇺🇸", countryName: "English" },
  { code: "es", label: "ES", flag: "🇪🇸", countryName: "Español" },
  { code: "it", label: "IT", flag: "🇮🇹", countryName: "Italiano" },
  { code: "fr", label: "FR", flag: "🇫🇷", countryName: "Français" },
  { code: "de", label: "DE", flag: "🇩🇪", countryName: "Deutsch" }
];

// ─── Multi-Language Dictionary ─────────────────────────────────────────────
const DICTIONARY: Record<LangCode, any> = {
  pt: {
    nav: { howItWorks: "Como Funciona", features: "Recursos", industries: "Segmentos", pricing: "Preços", faq: "FAQ", signIn: "Entrar", createBusiness: "Criar Empresa" },
    hero: {
      badge: "Plataforma SaaS para Serviços, Orçamentos e Agendamentos",
      titleMain: "Agendamentos simples.", titleSub: "Orçamentos em segundos.",
      description: "A plataforma completa para prestadores de serviços. Cadastre sua empresa, insira sua marca, adicione serviços extras e lance promoções com tempo limite.",
      primaryCta: "Criar Minha Empresa Grátis", secondaryCta: "Ver Demonstração",
      trustFees: "✓ Sem taxa por agendamento", trustSetup: "✓ Configuração em 5 min", trustCloud: "✓ 100% Online"
    },
    showcase: {
      windowUrl: "agendei.com/dashboard", statusBadge: "Empresa Ativa no Ar", publicPageTitle: "Página pública personalizada",
      agendaStatusLabel: "Status da Agenda:", agendaStatusVal: "Aberta 24/7", whatsappLabel: "Notificações WhatsApp:", whatsappVal: "Ativo",
      promoTitle: "Promoção com Tempo Limite", promoBadge: "Ativa", previewHeader: "Resumo da Página Pública do Cliente",
      mainServiceLabel: "Serviço Principal Escolhido", extraLabel: "EXTRA", totalLabel: "Total do Atendimento com Desconto:"
    },
    workflow: {
      pill: "Simplicidade e Agilidade", title: "No ar em quatro passos simples.", sub: "Sem necessidade de programar ou baixar aplicativos pesados. Roda direto do seu celular.",
      steps: [
        { num: "01", title: "Crie a Empresa", desc: "Informe o nome, adicione sua logo, telefone e endereço para gerar o link exclusivo." },
        { num: "02", title: "Cadastre Serviços", desc: "Liste os serviços principais e adicione serviços extras para aumentar o ticket médio." },
        { num: "03", title: "Lance Promoções", desc: "Crie ofertas com data de início e término para preencher os horários vagos." },
        { num: "04", title: "Receba Clientes", desc: "Seus clientes agendam sozinhos ou aprovam orçamentos diretamente pelo celular." }
      ]
    },
    industries: {
      title: "Para qualquer segmento de prestação de serviços.", sub: "Selecione o seu segmento abaixo para ver como o Agendei atende a sua necessidade.",
      exampleLabel: "Exemplo de Configuração", mainServiceLabel: "Serviço Principal:", extraServiceLabel: "Serviço Extra (Upsell):",
      presets: [
        { id: "mechanic", title: "Oficinas Mecânicas & Auto", description: "Orçamentos detalhados de peças e mão de obra com aprovação em 1 toque por WhatsApp.", company: "AutoFix Centro Automotivo", mainService: "Revisão Geral 10.000 km", mainPrice: "R$ 280,00", extraService: "Alinhamento 3D + Balanceamento", extraPrice: "+ R$ 90,00", promo: "Promoção de Férias: 20% OFF (Expira em 48h)" },
        { id: "barber", title: "Barbearias & Salões", description: "Agendamento online de horários sem fila de espera e upsell de serviços adicionais.", company: "Barbearia Don Corleone", mainService: "Corte Degradê + Barba Terápica", mainPrice: "R$ 85,00", extraService: "Sobrancelha Navalhada + Massagem", extraPrice: "+ R$ 30,00", promo: "Combo Terça-Feira: R$ 15 OFF (Restam 4 vagas)" },
        { id: "cleaning", title: "Limpeza Residencial", description: "Catálogo por ambiente com adicionais de passadoria e limpeza de vidros.", company: "CleanHome Serviços", mainService: "Faxina Residencial Completa", mainPrice: "R$ 180,00", extraService: "Passadoria de Roupas (15 pçs)", extraPrice: "+ R$ 60,00", promo: "Desconto 15% na Primeira Faxina" },
        { id: "petshop", title: "Pet Shop & Estética", description: "Agendamento por porte de pet com opcionais de hidratação e corte de unhas.", company: "PetCare Banho & Tosa", mainService: "Banho + Tosa Higiênica (Porte Média)", mainPrice: "R$ 95,00", extraService: "Corte de Unhas + Hidratação", extraPrice: "+ R$ 35,00", promo: "Quarta Maluca do Pet: R$ 20 OFF" }
      ]
    },
    features: {
      pill: "Recursos Completos", title: "Recursos focados em resultados práticos.", sub: "Tudo o que você precisa para gerenciar sua agenda e faturamento sem complicação.",
      items: [
        { title: "Página Própria da Empresa", desc: "Personalize com sua logo, fotos, telefone e endereço. Transmita credibilidade para o cliente." },
        { title: "Serviços Extras (Upsell)", desc: "Ofereça opcionais adicionais no momento do agendamento e aumente o valor médio por cliente." },
        { title: "Promoções Temporárias", desc: "Defina período inicial e final de descontos. Crie urgência para preencher horários em dias fracos." },
        { title: "Orçamentos sob Medida", desc: "Ideal para oficinas mecânicas. Monte a proposta e mande o link para o cliente aprovar em 1 toque." },
        { title: "Agendamento Automático 24/7", desc: "Seus clientes escolhem dia e horário disponíveis conforme as suas regras de atendimento." },
        { title: "Notificações por WhatsApp", desc: "Lembretes automáticos que reduzem significativamente as faltas dos clientes." }
      ]
    },
    pricing: {
      pill: "Planos Sem Surpresa", title: "Planos transparentes. Sem comissão.", sub: "Escolha o plano ideal para a sua empresa. Cancele a qualquer momento.",
      monthly: "Mensal", annual: "Anual (-20% OFF)", badgePopular: "Mais Popular",
      starter: { title: "Iniciante", desc: "Para profissionais que estão começando.", price: "R$ 0", period: " / sempre grátis", btn: "Começar Grátis", items: ["1 Empresa com Logo", "Até 30 Agendamentos/mês", "Link Público de Agendamento"] },
      pro: { title: "Profissional", desc: "Para empresas e prestadores ativos.", priceMonthly: "R$ 49", priceAnnual: "R$ 39", period: " / mês", btn: "Testar 14 Dias Grátis", items: ["Agendamentos Ilimitados", "Serviços Extras (Upsell)", "Promoções com Tempo Limite", "Orçamentos por WhatsApp", "Notificações & Lembretes"] },
      multi: { title: "Multi-Equipe", desc: "Para estabelecimentos com atendentes.", priceMonthly: "R$ 99", priceAnnual: "R$ 79", period: " / mês", btn: "Assinar Multi-Equipe", items: ["Tudo do Plano Profissional", "Múltiplos Atendentes", "Gestão de Comissões", "Suporte Prioritário"] }
    },
    faq: {
      title: "Perguntas Frequentes", sub: "Respostas rápidas para as dúvidas mais comuns.",
      items: [
        { q: "Como funciona a criação da conta e perfil da empresa?", a: "Após se cadastrar, você insere o nome do negócio, telefone, logotipo e endereço. O sistema cria automaticamente a sua página pública (ex: agendei.com/sua-empresa)." },
        { q: "Como funcionam os Serviços Extras (Upsell)?", a: "Você pode adicionar opcionais em cada serviço (ex: Alinhamento 3D na oficina, Passadoria na limpeza, Hidratação na barbearia). O cliente seleciona o extra durante o agendamento." },
        { q: "Como criar Promoções com tempo estipulado?", a: "Você define a data inicial e final do desconto no painel. A página pública exibe o aviso de promoção temporária com marcador de término." },
        { q: "Qual a diferença entre Orçamento e Agendamento Direto?", a: "Orçamentos permitem criar propostas sob medida (ideal para oficinas mecânicas) enviadas via link. Agendamentos permitem que o cliente escolha o horário diretamente." },
        { q: "O cliente precisa instalar algum aplicativo?", a: "Não. O cliente acessa a página da sua empresa diretamente pelo navegador do celular sem instalar nada." }
      ]
    },
    cta: { title: "Pronto para colocar a gestão da sua empresa no automático?", sub: "Crie sua conta em 2 minutos, insira sua logo, cadastre seus serviços extras e crie suas promoções ainda hoje.", primaryBtn: "Criar Minha Empresa Grátis", loginBtn: "Acessar Minha Conta" },
    footer: { rights: "© 2026 Agendei SaaS. Todos os direitos reservados." }
  },
  en: {
    nav: { howItWorks: "How It Works", features: "Features", industries: "Industries", pricing: "Pricing", faq: "FAQ", signIn: "Sign In", createBusiness: "Create Business" },
    hero: {
      badge: "SaaS Platform for Services, Estimates & Booking",
      titleMain: "Simple bookings.", titleSub: "Estimates in seconds.",
      description: "The complete platform for service providers. Set up your business, add your branding, attach extra add-ons, and launch time-limited promotions.",
      primaryCta: "Create Free Business Account", secondaryCta: "View Live Demo",
      trustFees: "✓ No booking commission fees", trustSetup: "✓ 5-min setup", trustCloud: "✓ 100% Cloud-based"
    },
    showcase: {
      windowUrl: "agendei.com/dashboard", statusBadge: "Live Business Account", publicPageTitle: "Custom Public Booking Page",
      agendaStatusLabel: "Calendar Status:", agendaStatusVal: "Open 24/7", whatsappLabel: "WhatsApp Reminders:", whatsappVal: "Active",
      promoTitle: "Time-Limited Promotion", promoBadge: "Active", previewHeader: "Client Public Page Summary",
      mainServiceLabel: "Selected Main Service", extraLabel: "EXTRA", totalLabel: "Total Customer Price with Discount:"
    },
    workflow: {
      pill: "Simple & Swift", title: "Up and running in four simple steps.", sub: "No coding or heavy app installs required. Runs straight from your mobile browser.",
      steps: [
        { num: "01", title: "Set Up Business", desc: "Enter your business name, logo, phone, and address to generate your booking link." },
        { num: "02", title: "Add Services", desc: "List your core services and attach extra add-ons to boost your average ticket size." },
        { num: "03", title: "Launch Deals", desc: "Create time-limited promotions with start and end dates to fill slow slots." },
        { num: "04", title: "Receive Bookings", desc: "Clients book appointments or approve estimates directly on their mobile phones." }
      ]
    },
    industries: {
      title: "Built for any service business industry.", sub: "Select your industry below to see how Agendei adapts to your workflow.",
      exampleLabel: "Configuration Example", mainServiceLabel: "Core Service:", extraServiceLabel: "Service Add-on (Upsell):",
      presets: [
        { id: "mechanic", title: "Auto Repair & Mechanics", description: "Detailed parts & labor estimates with 1-tap WhatsApp approval.", company: "AutoFix Care Center", mainService: "Full 10,000 km Vehicle Maintenance", mainPrice: "$280.00", extraService: "3D Wheel Alignment & Balancing", extraPrice: "+ $90.00", promo: "Holiday Deal: 20% OFF (Expires in 48h)" },
        { id: "barber", title: "Barbershops & Hair Salons", description: "Online appointment booking without waiting lines plus service add-ons.", company: "Don Corleone Barbershop", mainService: "Fade Haircut + Hot Towel Beard", mainPrice: "$85.00", extraService: "Razor Eyebrow Shaping + Scalp Massage", extraPrice: "+ $30.00", promo: "Tuesday Special: $15 OFF (4 slots left)" },
        { id: "cleaning", title: "House & Maid Cleaning", description: "Room-by-room booking catalog with ironing and window washing add-ons.", company: "CleanHome Services", mainService: "Full Home Deep Cleaning", mainPrice: "$180.00", extraService: "Ironing Package (15 garments)", extraPrice: "+ $60.00", promo: "15% Discount on First Cleaning" },
        { id: "petshop", title: "Pet Grooming & Care", description: "Pet size booking schedules with fur hydration and nail trimming add-ons.", company: "PetCare Grooming", mainService: "Full Bath & Grooming (Medium Dog)", mainPrice: "$95.00", extraService: "Nail Trimming + Coat Hydration", extraPrice: "+ $35.00", promo: "Wacky Wednesday: $20 OFF" }
      ]
    },
    features: {
      pill: "Complete Features", title: "Features built for real business growth.", sub: "Everything you need to manage your schedule and revenue effortlessly.",
      items: [
        { title: "Branded Business Page", desc: "Custom page with your logo, photos, phone, and address. Build trust with every customer." },
        { title: "Service Add-ons (Upsell)", desc: "Offer optional extra add-ons during booking to boost average revenue per client." },
        { title: "Time-Limited Deals", desc: "Set start and end dates for promotions to fill up empty slots on slow days." },
        { title: "Custom Price Estimates", desc: "Ideal for auto repair & custom jobs. Send estimate links for 1-tap client approval." },
        { title: "24/7 Automated Booking", desc: "Clients choose open dates and time slots based on your customized schedule rules." },
        { title: "WhatsApp Notifications", desc: "Automated reminders that dramatically reduce client no-shows." }
      ]
    },
    pricing: {
      pill: "No Surprise Fees", title: "Transparent pricing. No commission fees.", sub: "Choose the right plan for your business. Cancel anytime.",
      monthly: "Monthly", annual: "Annual (Save 20%)", badgePopular: "Most Popular",
      starter: { title: "Starter", desc: "For solo professionals just getting started.", price: "$0", period: " / free forever", btn: "Get Started Free", items: ["1 Business Profile with Logo", "Up to 30 Bookings/mo", "Public Booking Link"] },
      pro: { title: "Professional", desc: "For growing service businesses & shops.", priceMonthly: "$15", priceAnnual: "$12", period: " / month", btn: "Start 14-Day Free Trial", items: ["Unlimited Bookings", "Service Add-ons (Upsell)", "Time-Limited Deals", "WhatsApp Estimates", "Automated Reminders"] },
      multi: { title: "Multi-Team", desc: "For businesses with staff and multiple staff.", priceMonthly: "$29", priceAnnual: "$24", period: " / month", btn: "Subscribe Multi-Team", items: ["All Professional Features", "Multiple Staff Members", "Commission Tracking", "Priority Support"] }
    },
    faq: {
      title: "Frequently Asked Questions", sub: "Quick answers to common questions about Agendei.",
      items: [
        { q: "How does business profile setup work?", a: "After signing up, enter your business name, phone, logo, and address. The system automatically generates your public booking page (e.g. agendei.com/your-business)." },
        { q: "How do Service Add-ons (Upsells) work?", a: "You can attach optional extras to any service (e.g., 3D Alignment in repair shop, Ironing in cleaning, Scalp treatment in barbershop). Clients select add-ons during booking." },
        { q: "How do time-limited promotions work?", a: "Set start and end dates for your discounts in the dashboard. Your booking page shows a promo banner with countdown urgency." },
        { q: "What is the difference between Estimates and Direct Booking?", a: "Estimates let you build custom proposals (ideal for auto repair & custom jobs) sent via link. Direct Booking lets clients pick an open time slot immediately." },
        { q: "Do my clients need to download an app?", a: "No! Your clients open your booking link directly in any mobile or desktop web browser without installing anything." }
      ]
    },
    cta: { title: "Ready to automate your service business bookings?", sub: "Create your account in 2 minutes, upload your logo, add service extras, and launch deals today.", primaryBtn: "Create Free Business Account", loginBtn: "Sign In To Your Account" },
    footer: { rights: "© 2026 Agendei SaaS. All rights reserved." }
  },
  es: {
    nav: { howItWorks: "Cómo Funciona", features: "Funcionalidades", industries: "Sectores", pricing: "Precios", faq: "Preguntas", signIn: "Iniciar Sesión", createBusiness: "Crear Empresa" },
    hero: {
      badge: "Plataforma SaaS para Servicios, Presupuestos y Reservas",
      titleMain: "Reservas simples.", titleSub: "Presupuestos en segundos.",
      description: "La plataforma completa para proveedores de servicios. Registra tu empresa, añade tu logo, incluye servicios extra y lanza promociones con límite de tiempo.",
      primaryCta: "Crear Cuenta de Empresa Gratis", secondaryCta: "Ver Demostración",
      trustFees: "✓ Sin comisiones por reserva", trustSetup: "✓ Configuración en 5 min", trustCloud: "✓ 100% en la Nube"
    },
    showcase: {
      windowUrl: "agendei.com/dashboard", statusBadge: "Empresa Activa", publicPageTitle: "Página pública personalizada",
      agendaStatusLabel: "Estado de Agenda:", agendaStatusVal: "Abierta 24/7", whatsappLabel: "Notificaciones por WhatsApp:", whatsappVal: "Activo",
      promoTitle: "Promoción por Tiempo Limitado", promoBadge: "Activa", previewHeader: "Resumen de Página Pública del Cliente",
      mainServiceLabel: "Servicio Principal Elegido", extraLabel: "EXTRA", totalLabel: "Precio Total con Descuento:"
    },
    workflow: {
      pill: "Simplicidad y Rapidez", title: "En marcha en cuatro sencillos pasos.", sub: "Sin necesidad de programar ni instalar aplicaciones. Funciona directamente desde el móvil.",
      steps: [
        { num: "01", title: "Crea tu Empresa", desc: "Introduce nombre, logo, teléfono y dirección para generar tu enlace exclusivo." },
        { num: "02", title: "Añade Servicios", desc: "Lista tus servicios principales y agrega adicionales para aumentar el ticket medio." },
        { num: "03", title: "Lanza Ofertas", desc: "Crea promociones con fecha de inicio y fin para llenar horas libres." },
        { num: "04", title: "Recibe Reservas", desc: "Tus clientes reservan o aprueban presupuestos directamente en su teléfono." }
      ]
    },
    industries: {
      title: "Diseñado para cualquier sector de servicios.", sub: "Selecciona tu sector a continuación para ver cómo Agendei se adapta.",
      exampleLabel: "Ejemplo de Configuración", mainServiceLabel: "Servicio Principal:", extraServiceLabel: "Servicio Extra (Upsell):",
      presets: [
        { id: "mechanic", title: "Talleres Mecánicos y Automoción", description: "Presupuestos detallados de piezas y mano de obra con aprobación en 1 toque.", company: "AutoFix Centro Automotriz", mainService: "Revisión General 10.000 km", mainPrice: "€ 280,00", extraService: "Alineación 3D + Equilibrado", extraPrice: "+ € 90,00", promo: "Oferta de Vacaciones: 20% OFF (Expira en 48h)" },
        { id: "barber", title: "Barberías y Peluquerías", description: "Reserva de citas online sin colas de espera y servicios extra.", company: "Barbería Don Corleone", mainService: "Corte Degradado + Barba", mainPrice: "€ 85,00", extraService: "Diseño de Cejas + Masaje Capilar", extraPrice: "+ € 30,00", promo: "Especial Martes: € 15 OFF (Quedan 4 plazas)" },
        { id: "cleaning", title: "Limpieza de Hogar", description: "Catálogo por estancia con extras de planchado y limpieza de cristales.", company: "CleanHome Servicios", mainService: "Limpieza Residencial Completa", mainPrice: "€ 180,00", extraService: "Planchado de Ropa (15 prendas)", extraPrice: "+ € 60,00", promo: "15% de Descuento en Primera Limpieza" },
        { id: "petshop", title: "Peluquería Canina y Pets", description: "Reservas por tamaño de mascota con hidratación y corte de uñas.", company: "PetCare Peluquería Canina", mainService: "Baño + Corte (Perro Mediano)", mainPrice: "€ 95,00", extraService: "Corte de Uñas + Hidratación", extraPrice: "+ € 35,00", promo: "Miércoles Loco: € 20 OFF" }
      ]
    },
    features: {
      pill: "Funcionalidades Completas", title: "Funcionalidades enfocadas en el crecimiento.", sub: "Todo lo que necesitas para gestionar tu agenda y facturación sin complicaciones.",
      items: [
        { title: "Página Propia con tu Marca", desc: "Personaliza con tu logo, fotos, teléfono y dirección. Transmite confianza al cliente." },
        { title: "Servicios Extras (Upsell)", desc: "Ofrece adicionales durante la reserva y aumenta la facturación por cliente." },
        { title: "Promociones Temporales", desc: "Define fechas de inicio y fin para llenar huecos en días de menor volumen." },
        { title: "Presupuestos a Medida", desc: "Ideal para talleres. Crea la propuesta y envía el enlace para aprobación en 1 toque." },
        { title: "Reserva Automática 24/7", desc: "Tus clientes eligen fecha y hora según tus reglas de disponibilidad." },
        { title: "Notificaciones por WhatsApp", desc: "Recordatorios automáticos que reducen drásticamente las ausencias." }
      ]
    },
    pricing: {
      pill: "Sin Sorpresas", title: "Precios transparentes. Sin comisiones.", sub: "Elige el plan ideal para tu empresa. Cancela cuando quieras.",
      monthly: "Mensual", annual: "Anual (-20% OFF)", badgePopular: "Más Popular",
      starter: { title: "Inicial", desc: "Para profesionales que empiezan.", price: "€ 0", period: " / gratis siempre", btn: "Empezar Gratis", items: ["1 Empresa con Logo", "Hasta 30 Reservas/mes", "Enlace Público de Reserva"] },
      pro: { title: "Profesional", desc: "Para empresas y negocios activos.", priceMonthly: "€ 15", priceAnnual: "€ 12", period: " / mes", btn: "Probar 14 Días Gratis", items: ["Reservas Ilimitadas", "Servicios Extras (Upsell)", "Promociones con Límite de Tiempo", "Presupuestos por WhatsApp", "Recordatorios Automáticos"] },
      multi: { title: "Multi-Equipo", desc: "Para negocios con personal.", priceMonthly: "€ 29", priceAnnual: "€ 24", period: " / mes", btn: "Suscribirse Multi-Equipo", items: ["Todo el Plan Profesional", "Múltiples Empleados", "Gestión de Comisiones", "Soporte Prioritario"] }
    },
    faq: {
      title: "Preguntas Frequentes", sub: "Respuestas rápidas a las dudas más habituales.",
      items: [
        { q: "¿Cómo se crea el perfil de la empresa?", a: "Al registrarte, introduces nombre, teléfono, logo y dirección. El sistema genera tu página pública automáticamente (ej: agendei.com/tu-empresa)." },
        { q: "¿Cómo funcionan los Servicios Extras (Upsell)?", a: "Añades opciones a cualquier servicio (ej: Alineación en taller, Planchado en limpieza). El cliente los selecciona al reservar." },
        { q: "¿Cómo crear promociones temporales?", a: "Defines la fecha inicial y final del descuento en el panel. Tu página pública muestra el cartel de oferta con límite de tiempo." },
        { q: "Diferencia entre Presupuesto y Reserva Directa?", a: "Los presupuestos te permiten enviar propuestas a medida (para talleres). Las reservas directas permiten elegir fecha y hora en el acto." },
        { q: "¿El cliente necesita instalar alguna app?", a: "No. El cliente abre el enlace directamente en su navegador móvil sin descargar nada." }
      ]
    },
    cta: { title: "¿Listo para automatizar la gestión de tu empresa?", sub: "Crea tu cuenta en 2 minutos, sube tu logo, añade servicios extra y lanza ofertas hoy.", primaryBtn: "Crear Cuenta de Empresa Gratis", loginBtn: "Acceder a Mi Cuenta" },
    footer: { rights: "© 2026 Agendei SaaS. Todos los derechos reservados." }
  },
  it: {
    nav: { howItWorks: "Come Funziona", features: "Funzionalità", industries: "Settori", pricing: "Prezzi", faq: "FAQ", signIn: "Accedi", createBusiness: "Crea Azienda" },
    hero: {
      badge: "Piattaforma SaaS per Servizi, Preventivi e Prenotazioni",
      titleMain: "Prenotazioni semplici.", titleSub: "Preventivi in pochi secondi.",
      description: "La piattaforma completa per professionisti. Registra la tua azienda, inserisci il tuo logo, aggiungi servizi extra e lancia promozioni a tempo.",
      primaryCta: "Crea Account Aziendale Gratis", secondaryCta: "Vedi Demo",
      trustFees: "✓ Nessuna commissione sulle prenotazioni", trustSetup: "✓ Configurazione in 5 min", trustCloud: "✓ 100% sul Cloud"
    },
    showcase: {
      windowUrl: "agendei.com/dashboard", statusBadge: "Azienda Attiva", publicPageTitle: "Pagina pubblica personalizzata",
      agendaStatusLabel: "Stato Agenda:", agendaStatusVal: "Aperta 24/7", whatsappLabel: "Notifiche WhatsApp:", whatsappVal: "Attivo",
      promoTitle: "Promozione a Tempo Limitato", promoBadge: "Attiva", previewHeader: "Riepilogo Pagina Pubblica Cliente",
      mainServiceLabel: "Servizio Principale Selezionato", extraLabel: "EXTRA", totalLabel: "Totale Servizio con Sconto:"
    },
    workflow: {
      pill: "Semplicità e Velocità", title: "Attivo in quattro semplici passaggi.", sub: "Nessuna programmazione o app da scaricare. Funziona direttamente dal tuo smartphone.",
      steps: [
        { num: "01", title: "Crea l'Azienda", desc: "Inserisci nome, logo, telefono e indirizzo per generare il tuo link di prenotazione." },
        { num: "02", title: "Aggiungi Servizi", desc: "Elenca i servizi principali e aggiungi extra per aumentare il valore medio della prenotazione." },
        { num: "03", title: "Lancia Offerte", desc: "Crea promozioni con data di inizio e fine per riempire gli orari liberi." },
        { num: "04", title: "Ricevi Clienti", desc: "I tuoi clienti prenotano o approvano preventivi direttamente dallo smartphone." }
      ]
    },
    industries: {
      title: "Pensato per qualsiasi settore di servizi.", sub: "Seleziona il tuo settore qui sotto per vedere come si adatta Agendei.",
      exampleLabel: "Esempio di Configurazione", mainServiceLabel: "Servizio Principale:", extraServiceLabel: "Servizio Extra (Upsell):",
      presets: [
        { id: "mechanic", title: "Officine Meccaniche & Auto", description: "Preventivi dettagliati per ricambi e manodopera con approvazione in 1 tap su WhatsApp.", company: "AutoFix Centro Auto", mainService: "Tagliando Completo 10.000 km", mainPrice: "€ 280,00", extraService: "Assetto Ruote 3D + Equilibratura", extraPrice: "+ € 90,00", promo: "Promo Vacanze: 20% OFF (Scade in 48h)" },
        { id: "barber", title: "Barbieri & Saloni di Bellezza", description: "Prenotazione online di appuntamenti senza attese e servizi extra aggiuntivi.", company: "Barberia Don Corleone", mainService: "Taglio Sfumato + Barba Panno Caldo", mainPrice: "€ 85,00", extraService: "Definizione Sopracciglia + Massaggio", extraPrice: "+ € 30,00", promo: "Speciale Martedì: € 15 OFF (4 posti rimasti)" },
        { id: "cleaning", title: "Imprese di Pulizia Casa", description: "Catalogo per ambiente con extra per stiratura e lavaggio vetri.", company: "CleanHome Servizi", mainService: "Pulizia Casa Completa", mainPrice: "€ 180,00", extraService: "Stiratura Abiti (15 capi)", extraPrice: "+ € 60,00", promo: "15% di Sconto sulla Prima Pulizia" },
        { id: "petshop", title: "Toilette Cani & Pet Care", description: "Prenotazioni per taglia dell'animale con idratazione e taglio unghie.", company: "PetCare Tolettatura", mainService: "Bagno + Taglio (Cane Medio)", mainPrice: "€ 95,00", extraService: "Taglio Unghie + Idratazione Pelo", extraPrice: "+ € 35,00", promo: "Mercoledì Pet: € 20 OFF" }
      ]
    },
    features: {
      pill: "Funzionalità Complete", title: "Funzionalità pensate per la crescita reale.", sub: "Tutto ciò di cui hai bisogno per gestire agenda e fatturato senza complicazioni.",
      items: [
        { title: "Pagina Aziendale con Brand", desc: "Personalizza con logo, foto, telefono e indirizzo. Trasmetti massima fiducia ai clienti." },
        { title: "Servizi Extra (Upsell)", desc: "Offri opzioni aggiuntive durante la prenotazione e aumenta il valore medio della vendita." },
        { title: "Promozioni a Tempo", desc: "Imposta data di inizio e fine per riempire gli orari vuoti nei giorni meno affollati." },
        { title: "Preventivi Su Misura", desc: "Ideale per officine. Crea la proposta e invia il link per l'approvazione in 1 tap." },
        { title: "Prenotazione Automatica 24/7", desc: "I clienti scelgono giorno e ora disponibili in base alle tue regole di calendario." },
        { title: "Notifiche via WhatsApp", desc: "Promemoria automatici che riducono drasticamente i mancati appuntamenti." }
      ]
    },
    pricing: {
      pill: "Zero Sorprese", title: "Prezzi trasparenti. Nessuna commissione.", sub: "Scegli il piano ideale per la tua attività. Cancella quando vuoi.",
      monthly: "Mensile", annual: "Annuale (-20% OFF)", badgePopular: "Più Popolare",
      starter: { title: "Base", desc: "Per professionisti alle prime armi.", price: "€ 0", period: " / sempre gratis", btn: "Inizia Gratis", items: ["1 Profilo Azienda con Logo", "Fino a 30 Prenotazioni/mese", "Link Pubblico di Prenotazione"] },
      pro: { title: "Professionale", desc: "Per attività e negozi avviati.", priceMonthly: "€ 15", priceAnnual: "€ 12", period: " / mese", btn: "Prova 14 Giorni Gratis", items: ["Prenotazioni Illimitate", "Servizi Extra (Upsell)", "Promozioni a Tempo", "Preventivi WhatsApp", "Notifiche e Promemoria"] },
      multi: { title: "Multi-Team", desc: "Per attività con più collaboratori.", priceMonthly: "€ 29", priceAnnual: "€ 24", period: " / mese", btn: "Abbonati Multi-Team", items: ["Tutto del Piano Professionale", "Collaboratori Multipli", "Gestione Provvigioni", "Supporto Prioritario"] }
    },
    faq: {
      title: "Domande Frequenti", sub: "Risposte rapide ai dubbi più comuni.",
      items: [
        { q: "Come funziona la configurazione dell'azienda?", a: "Dopo la registrazione, inserisci nome, telefono, logo e indirizzo. Il sistema crea automaticamente la tua pagina pubblica (es: agendei.com/tua-azienda)." },
        { q: "Come funzionano i Servizi Extra (Upsell)?", a: "Puoi aggiungere opzioni a qualsiasi servizio (es: Assetto in officina, Stiratura nella pulizia). Il cliente li seleziona al momento della prenotazione." },
        { q: "Come si creano le promozioni a tempo?", a: "Imposti data iniziale e finale dello sconto dal pannello. La tua pagina pubblica mostrerà il banner con il conteggio di scadenza." },
        { q: "Differenza tra Preventivo e Prenotazione Diretta?", a: "I preventivi permettono di inviare proposte su misura (per officine). Le prenotazioni dirette consentono al cliente di scegliere subito data e ora." },
        { q: "Il cliente deve scaricare un'app?", a: "No. Il cliente apre il link direttamente dal browser dello smartphone senza installare nulla." }
      ]
    },
    cta: { title: "Pronto ad automatizzare la gestione delle prenotazioni?", sub: "Crea il tuo account in 2 minuti, carica il tuo logo, aggiungi servizi extra e lancia promozioni oggi stesso.", primaryBtn: "Crea Account Aziendale Gratis", loginBtn: "Accedi al Mio Account" },
    footer: { rights: "© 2026 Agendei SaaS. Tutti i diritti riservati." }
  },
  fr: {
    nav: { howItWorks: "Comment Ça Marche", features: "Fonctionnalités", industries: "Secteurs", pricing: "Tarifs", faq: "FAQ", signIn: "Connexion", createBusiness: "Créer une Entreprise" },
    hero: {
      badge: "Plateforme SaaS de Réservation, Devis et Services",
      titleMain: "Réservations simples.", titleSub: "Devis en quelques secondes.",
      description: "La plateforme complète pour les prestataires de services. Créez votre profil d'entreprise, ajoutez votre logo, vos options extra et vos promotions à durée limitée.",
      primaryCta: "Créer un Compte Entreprise Gratuit", secondaryCta: "Voir la Démo",
      trustFees: "✓ Aucune commission sur les réservations", trustSetup: "✓ Configuration en 5 min", trustCloud: "✓ 100% dans le Cloud"
    },
    showcase: {
      windowUrl: "agendei.com/dashboard", statusBadge: "Entreprise En Ligne", publicPageTitle: "Page publique personnalisée",
      agendaStatusLabel: "Statut du Planning:", agendaStatusVal: "Ouvert 24/7", whatsappLabel: "Rappels WhatsApp:", whatsappVal: "Actif",
      promoTitle: "Offre à Durée Limitée", promoBadge: "Active", previewHeader: "Aperçu de la Page Publique Client",
      mainServiceLabel: "Service Principal Sélectionné", extraLabel: "EXTRA", totalLabel: "Prix Total avec Réduction:"
    },
    workflow: {
      pill: "Simplicité et Rapidité", title: "Opérationnel en quatre étapes simples.", sub: "Aucun codage ni téléchargement d'application. Fonctionne directement depuis votre smartphone.",
      steps: [
        { num: "01", title: "Créez l'Entreprise", desc: "Entrez le nom, votre logo, téléphone et adresse pour générer votre lien exclusif." },
        { num: "02", title: "Ajoutez vos Services", desc: "Lister les services principaux et ajoutez des options extra pour augmenter le panier moyen." },
        { num: "03", title: "Lancez des Offres", desc: "Créez des promotions temporaires avec dates de début et fin pour remplir les creux." },
        { num: "04", title: "Recevez les Clients", desc: "Vos clients réservent ou valident leurs devis directement depuis leur smartphone." }
      ]
    },
    industries: {
      title: "Conçu pour tous les secteurs de services.", sub: "Sélectionnez votre domaine ci-dessous pour voir comment Agendei s'adapte.",
      exampleLabel: "Exemple de Configuration", mainServiceLabel: "Service Principal:", extraServiceLabel: "Service Extra (Upsell):",
      presets: [
        { id: "mechanic", title: "Garages & Mécanique Auto", description: "Devis détaillés pièces et main-d'œuvre avec validation 1-clic sur WhatsApp.", company: "AutoFix Centre Auto", mainService: "Révision Générale 10 000 km", mainPrice: "280,00 €", extraService: "Parallélisme 3D + Équilibrage", extraPrice: "+ 90,00 €", promo: "Offre Vacances: -20% (Expire dans 48h)" },
        { id: "barber", title: "Coiffure & Barbiers", description: "Prise de rendez-vous en ligne sans attente avec options de soins supplémentaires.", company: "Barberie Don Corleone", mainService: "Coupe Dégradé + Barbe Serviette Chaude", mainPrice: "85,00 €", extraService: "Taille de Sourcils + Massage Cuir Chevelu", extraPrice: "+ 30,00 €", promo: "Spécial Mardi: -15 € (4 places restantes)" },
        { id: "cleaning", title: "Ménage & Services à Domicile", description: "Catalogue par pièce avec extras repassage et nettoyage de vitres.", company: "CleanHome Services", mainService: "Ménage Résidentiel Complet", mainPrice: "180,00 €", extraService: "Formule Repassage (15 vêtements)", extraPrice: "+ 60,00 €", promo: "-15% sur le Premier Ménage" },
        { id: "petshop", title: "Toilettage Canin & Animaux", description: "Réservation selon la taille de l'animal avec soin du pelage et coupe des griffes.", company: "PetCare Toilettage", mainService: "Bain + Coupe (Chien Moyen)", mainPrice: "95,00 €", extraService: "Coupe des Griffes + Hydratation Pelage", extraPrice: "+ 35,00 €", promo: "Mercredi Animaux: -20 €" }
      ]
    },
    features: {
      pill: "Fonctionnalités Complètes", title: "Des fonctionnalités axées sur votre croissance.", sub: "Tout le nécessaire pour gérer votre planning et vos revenus en toute simplicité.",
      items: [
        { title: "Page Entreprise Personnalisée", desc: "Ajoutez votre logo, photos, téléphone et adresse. Offrez une image professionnelle." },
        { title: "Services Extra (Upsell)", desc: "Proposez des options additionnelles lors de la réservation et augmentez votre chiffre d'affaires." },
        { title: "Promotions Temporelles", desc: "Définissez une date de début et de fin pour vos réductions afin de remplir les périodes creuses." },
        { title: "Devis Sur-Mesure", desc: "Idéal pour les garages. Créez la proposition et envoyez le lien pour validation 1-clic." },
        { title: "Réservation Automatisée 24/7", desc: "Vos clients choisissent leur créneau selon vos règles de disponibilité." },
        { title: "Notifications WhatsApp", desc: "Rappels automatiques réduisant considérablement les rendez-vous manqués." }
      ]
    },
    pricing: {
      pill: "Sans Surprise", title: "Tarifs transparents. Sans aucune commission.", sub: "Choisissez l'offre adaptée à votre activité. Annulez à tout moment.",
      monthly: "Mensuel", annual: "Annuel (-20% Réduction)", badgePopular: "Le Plus Populaire",
      starter: { title: "Débutant", desc: "Pour les indépendants qui se lancent.", price: "0 €", period: " / gratuit toujours", btn: "Commencer Gratuitement", items: ["1 Profil Entreprise avec Logo", "Jusqu'à 30 Réservations/mois", "Lien Public de Réservation"] },
      pro: { title: "Professionnel", desc: "Pour les entreprises et commerces actifs.", priceMonthly: "15 €", priceAnnual: "12 €", period: " / mois", btn: "Tester 14 Jours Gratuitement", items: ["Réservations Illimitées", "Services Extra (Upsell)", "Promotions à Durée Limitée", "Devis par WhatsApp", "Rappels Automatiques"] },
      multi: { title: "Multi-Équipe", desc: "Pour les établissements avec personnel.", priceMonthly: "29 €", priceAnnual: "24 €", period: " / mois", btn: "S'abonner Multi-Équipe", items: ["Tout du Plan Professionnel", "Collaborateurs Multiples", "Gestion des Commissions", "Support Prioritaire"] }
    },
    faq: {
      title: "Foire Aux Questions", sub: "Réponses rapides aux questions fréquentes.",
      items: [
        { q: "Comment configurer le profil de l'entreprise ?", a: "Après votre inscription, entrez nom, téléphone, logo et adresse. Votre page publique est créée automatiquement (ex: agendei.com/votre-entreprise)." },
        { q: "Comment fonctionnent les Services Extra (Upsell) ?", a: "Vous pouvez ajouter des options à chaque service (ex: Parallélisme en garage, Repassage en ménage). Le client les coche lors de sa réservation." },
        { q: "Comment créer une offre à durée limitée ?", a: "Vous fixez la date de début et de fin de la réduction. Votre page publique affichera le badge promo avec décompte d'urgence." },
        { q: "Différence entre Devis et Réservation Directe ?", a: "Les devis vous permettent d'envoyer des propositions sur-mesure (pour garages). La réservation directe permet de choisir date et heure en direct." },
        { q: "Le client doit-il télécharger une application ?", a: "Non. Le client ouvre votre lien directement dans son navigateur web mobile sans rien installer." }
      ]
    },
    cta: { title: "Prêt à automatiser la gestion de vos réservations ?", sub: "Créez votre compte en 2 minutes, ajoutez votre logo, vos services extra et lancez vos promotions dès aujourd'hui.", primaryBtn: "Créer un Compte Entreprise Gratuit", loginBtn: "Accéder à Mon Compte" },
    footer: { rights: "© 2026 Agendei SaaS. Tous droits réservés." }
  },
  de: {
    nav: { howItWorks: "Wie Es Funktioniert", features: "Funktionen", industries: "Branchen", pricing: "Preise", faq: "FAQ", signIn: "Anmelden", createBusiness: "Firma Erstellen" },
    hero: {
      badge: "SaaS-Plattform für Buchungen, Angebote & Termine",
      titleMain: "Einfache Buchungen.", titleSub: "Angebote in Sekunden.",
      description: "Die komplette Plattform für Dienstleister. Erstellen Sie Ihr Unternehmensprofil, fügen Sie Ihr Logo, Zusatzleistungen und zeitlich begrenzte Angebote hinzu.",
      primaryCta: "Kostenloses Firmenkonto Erstellen", secondaryCta: "Live-Demo Ansehen",
      trustFees: "✓ Keine Buchungsgebühren", trustSetup: "✓ 5-Minuten-Einrichtung", trustCloud: "✓ 100% Cloudbasiert"
    },
    showcase: {
      windowUrl: "agendei.com/dashboard", statusBadge: "Aktives Firmenkonto", publicPageTitle: "Personalisierte öffentliche Buchungsseite",
      agendaStatusLabel: "Kalenderstatus:", agendaStatusVal: "24/7 Geöffnet", whatsappLabel: "WhatsApp-Erinnerungen:", whatsappVal: "Aktiv",
      promoTitle: "Zeitlich Begrenztes Angebot", promoBadge: "Aktiv", previewHeader: "Übersicht der Kundenbuchungsseite",
      mainServiceLabel: "Ausgewählte Hauptleistung", extraLabel: "EXTRA", totalLabel: "Gesamtpreis mit Rabatt:"
    },
    workflow: {
      pill: "Einfach & Schnelligkeit", title: "In vier einfachen Schritten startklar.", sub: "Keine Programmierkenntnisse oder App-Downloads erforderlich. Läuft direkt auf Ihrem Smartphone.",
      steps: [
        { num: "01", title: "Firma Einrichten", desc: "Geben Sie Name, Logo, Telefon und Adresse ein, um Ihren Buchungslink zu erstellen." },
        { num: "02", title: "Leistungen Hinzufügen", desc: "Erstellen Sie Hauptleistungen und Zusatzoptionen zur Steigerung des Umsatzes." },
        { num: "03", title: "Aktionen Starten", desc: "Erstellen Sie Angebote mit Start- und Enddatum, um freie Termine zu füllen." },
        { num: "04", title: "Kunden Empfangen", desc: "Kunden buchen Termine oder bestätigen Angebote direkt über Ihr Smartphone." }
      ]
    },
    industries: {
      title: "Für jede Dienstleistungsbranche entwickelt.", sub: "Wählen Sie Ihre Branche aus, um zu sehen, wie sich Agendei anpasst.",
      exampleLabel: "Konfigurationsbeispiel", mainServiceLabel: "Hauptleistung:", extraServiceLabel: "Zusatzleistung (Upsell):",
      presets: [
        { id: "mechanic", title: "Kfz-Werkstätten & Autopflege", description: "Detaillierte Ersatzteil- & Arbeitswertangebote mit 1-Klick-Bestätigung per WhatsApp.", company: "AutoFix Kfz-Meisterbetrieb", mainService: "Inspektion 10.000 km", mainPrice: "280,00 €", extraService: "3D-Achsvermessung + Auswuchten", extraPrice: "+ 90,00 €", promo: "Urlaubs-Aktion: 20% Rabatt (Endet in 48h)" },
        { id: "barber", title: "Friseure & Barber Shops", description: "Online-Terminbuchung ohne Wartezeiten plus Zusatzleistungen.", company: "Don Corleone Barber Shop", mainService: "Fade Cut + Bartpflege mit Hot Towel", mainPrice: "85,00 €", extraService: "Augenbrauen Formeln + Kopfmassage", extraPrice: "+ 30,00 €", promo: "Dienstag-Spezial: 15 € Rabatt (Noch 4 Plätze)" },
        { id: "cleaning", title: "Gebäudereinigung & Haushalt", description: "Raum-für-Raum Buchungskatalog mit Bügel- und Fensterreinigungs-Extras.", company: "CleanHome Gebäudereinigung", mainService: "Haushalts-Grundreinigung", mainPrice: "180,00 €", extraService: "Bügelservice Paket (15 Teile)", extraPrice: "+ 60,00 €", promo: "15% Rabatt auf die Erstreinigung" },
        { id: "petshop", title: "Hundefriseur & Kleintierpflege", description: "Terminbuchung nach Rassegröße mit Fellpflege & Krallenschneiden.", company: "PetCare Hunde-Salon", mainService: "Wäsche + Schur (Mittlerer Hund)", mainPrice: "95,00 €", extraService: "Krallen Schneiden + Fell-Pflege", extraPrice: "+ 35,00 €", promo: "Hunde-Mittwoch: 20 € Rabatt" }
      ]
    },
    features: {
      pill: "Vollständige Funktionen", title: "Funktionen für echtes Geschäftswachstum.", sub: "Alles, was Sie zur mühelosen Verwaltung von Kalender und Umsatz benötigen.",
      items: [
        { title: "Eigene Unternehmensseite", desc: "Personalisieren Sie mit Logo, Fotos, Telefon und Adresse für maximales Vertrauen." },
        { title: "Zusatzleistungen (Upsell)", desc: "Bieten Sie beim Buchen Extras an und steigern Sie den Durchschnittsumsatz pro Kunde." },
        { title: "Zeitlich Begrenzte Aktionen", desc: "Legen Sie Start- und Enddaten fest, um ruhige Tage gezielt auszulasten." },
        { title: "Individuelle Angebote", desc: "Ideal für Werkstätten. Erstellen Sie Angebote und senden Sie den Link zur 1-Klick-Zustimmung." },
        { title: "24/7 Automatische Buchung", desc: "Kunden wählen freie Zeiten nach Ihren individuellen Kalenderregeln." },
        { title: "WhatsApp-Benachrichtigungen", desc: "Automatische Erinnerungen, die Ausfälle und No-Shows drastisch reduzieren." }
      ]
    },
    pricing: {
      pill: "Keine Versteckten Kosten", title: "Transparente Preise. Keine Provisionen.", sub: "Wählen Sie das passende Paket für Ihr Unternehmen. Jederzeit kündbar.",
      monthly: "Monatlich", annual: "Jährlich (-20% Rabatt)", badgePopular: "Am Beliebtesten",
      starter: { title: "Starter", desc: "Für Einzelunternehmer beim Start.", price: "0 €", period: " / dauerhaft kostenlos", btn: "Kostenlos Starten", items: ["1 Firmenprofil mit Logo", "Bis zu 30 Buchungen/Monat", "Öffentlicher Buchungslink"] },
      pro: { title: "Professional", desc: "Für wachsende Betriebe & Geschäfte.", priceMonthly: "15 €", priceAnnual: "12 €", period: " / Monat", btn: "14 Tage Kostenlos Testen", items: ["Unbegrenzte Buchungen", "Zusatzleistungen (Upsell)", "Zeitlich Begrenzte Aktionen", "Angebot per WhatsApp", "Automatische Erinnerungen"] },
      multi: { title: "Multi-Team", desc: "Für Betriebe mit Mitarbeitern.", priceMonthly: "29 €", priceAnnual: "24 €", period: " / Monat", btn: "Multi-Team Buchen", items: ["Alle Pro-Funktionen", "Mehrere Mitarbeiter", "Provisionsverwaltung", "Prioritäts-Support"] }
    },
    faq: {
      title: "Häufig Gestellte Fragen", sub: "Schnelle Antworten auf die wichtigsten Fragen.",
      items: [
        { q: "Wie funktioniert die Erstellung des Firmenprofils?", a: "Nach der Registrierung geben Sie Name, Telefon, Logo und Adresse ein. Das System erstellt automatisch Ihre Buchungsseite (z.B. agendei.com/ihre-firma)." },
        { q: "Wie funktionieren Zusatzleistungen (Upsell)?", a: "Sie können zu jeder Leistung Extras hinzufügen (z.B. Achsvermessung in der Werkstatt). Der Kunde wählt diese bei der Buchung aus." },
        { q: "Wie erstelle ich zeitlich begrenzte Angebote?", a: "Sie legen Start- und Enddatum im Dashboard fest. Ihre Buchungsseite zeigt das Angebot mit Countdown an." },
        { q: "Unterschied zwischen Angebot und Direktbuchung?", a: "Angebote ermöglichen individuelle Kostenvoranschläge (für Werkstätten). Direktbuchungen erlauben die sofortige Terminauswahl." },
        { q: "Müssen Kunden eine App installieren?", a: "Nein. Kunden öffnen Ihren Link direkt im mobilen Webbrowser ohne App-Download." }
      ]
    },
    cta: { title: "Bereit, Ihre Terminvergabe zu automatisieren?", sub: "Erstellen Sie Ihr Konto in 2 Minuten, laden Sie Ihr Logo hoch und starten Sie noch heute.", primaryBtn: "Kostenloses Firmenkonto Erstellen", loginBtn: "Anmelden" },
    footer: { rights: "© 2026 Agendei SaaS. Alle Rechte vorbehalten." }
  }
};

export default function HomePage() {
  const [lang, setLang] = useState<LangCode>("pt");
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [selectedTab, setSelectedTab] = useState<"mechanic" | "barber" | "cleaning" | "petshop">("mechanic");

  const langMenuRef = useRef<HTMLDivElement>(null);

  // ── Automatic Geolocation / Browser Language Detection ──
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userBrowserLang = (navigator.language || (navigator as any).userLanguage || "").toLowerCase();
      
      if (userBrowserLang.startsWith("pt")) setLang("pt");
      else if (userBrowserLang.startsWith("es")) setLang("es");
      else if (userBrowserLang.startsWith("it")) setLang("it");
      else if (userBrowserLang.startsWith("fr")) setLang("fr");
      else if (userBrowserLang.startsWith("de")) setLang("de");
      else setLang("en"); // Default fallback for USA & Global
    }
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const t = DICTIONARY[lang] || DICTIONARY.en;
  const currentLangObj = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  const currentPreset = t.industries.presets.find((b: any) => b.id === selectedTab) || t.industries.presets[0];

  return (
    <div className="min-h-screen bg-stone-50/50 text-stone-900 font-sans selection:bg-stone-900 selection:text-white antialiased">
      
      {/* ── 1. Navbar Ampliada com Suporte Ultrawide (max-w-[1760px]) ── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200/80">
        <div className="max-w-[1760px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-white font-black text-sm flex items-center justify-center tracking-tighter shadow-sm">
              a.
            </div>
            <span className="font-bold tracking-tight text-stone-900 text-lg">
              agendei<span className="text-stone-400">.</span>
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-stone-600">
            <a href="#como-funciona" className="hover:text-stone-900 transition-colors">{t.nav.howItWorks}</a>
            <a href="#recursos" className="hover:text-stone-900 transition-colors">{t.nav.features}</a>
            <a href="#segmentos" className="hover:text-stone-900 transition-colors">{t.nav.industries}</a>
            <a href="#precos" className="hover:text-stone-900 transition-colors">{t.nav.pricing}</a>
            <a href="#faq" className="hover:text-stone-900 transition-colors">{t.nav.faq}</a>
          </nav>

          {/* Globe Language Dropdown + Auth Actions */}
          <div className="hidden md:flex items-center gap-4">
            
            {/* Globe Language Selector Dropdown (Hover / Click) */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                onMouseEnter={() => setLangMenuOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-stone-100 border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-200/80 transition-all shadow-sm"
              >
                <Globe />
                <span className="flex items-center gap-1.5">
                  <span>{currentLangObj.flag}</span>
                  <span>{currentLangObj.label}</span>
                </span>
                <ChevronDown />
              </button>

              {/* Dropdown Menu */}
              {langMenuOpen && (
                <div
                  onMouseLeave={() => setLangMenuOpen(false)}
                  className="absolute right-0 mt-2 w-52 bg-white border border-stone-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 mb-1">
                    Select Language / Idioma
                  </div>
                  {LANGUAGES.map((item) => (
                    <button
                      key={item.code}
                      onClick={() => {
                        setLang(item.code);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        lang === item.code
                          ? "bg-stone-900 text-white font-bold"
                          : "text-stone-700 hover:bg-stone-100"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base">{item.flag}</span>
                        <span>{item.countryName}</span>
                      </span>
                      <span className="text-[10px] opacity-70 font-mono">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/login"
              className="text-sm font-semibold text-stone-700 hover:text-stone-900 px-3 py-2 transition-colors"
            >
              {t.nav.signIn}
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-stone-900 text-white hover:bg-stone-800 px-6 py-2.5 rounded-full transition-all shadow-sm"
            >
              {t.nav.createBusiness}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="p-2 rounded-lg border border-stone-200 bg-stone-100 text-xs font-bold text-stone-700 flex items-center gap-1.5"
            >
              <Globe />
              <span>{currentLangObj.flag} {currentLangObj.label}</span>
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-stone-600 hover:text-stone-900"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-stone-200 px-6 py-6 space-y-4">
            <div className="pb-3 border-b border-stone-100 space-y-2">
              <span className="text-xs font-bold text-stone-500 uppercase block">Idioma / Select Language:</span>
              <div className="grid grid-cols-3 gap-2">
                {LANGUAGES.map((item) => (
                  <button
                    key={item.code}
                    onClick={() => {
                      setLang(item.code);
                      setMobileMenuOpen(false);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 ${
                      lang === item.code ? "bg-stone-900 text-white border-stone-900" : "bg-stone-50 text-stone-700 border-stone-200"
                    }`}
                  >
                    <span>{item.flag}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <nav className="flex flex-col gap-3 font-semibold text-sm text-stone-700">
              <a href="#como-funciona" onClick={() => setMobileMenuOpen(false)}>{t.nav.howItWorks}</a>
              <a href="#recursos" onClick={() => setMobileMenuOpen(false)}>{t.nav.features}</a>
              <a href="#segmentos" onClick={() => setMobileMenuOpen(false)}>{t.nav.industries}</a>
              <a href="#precos" onClick={() => setMobileMenuOpen(false)}>{t.nav.pricing}</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)}>{t.nav.faq}</a>
            </nav>
            <div className="pt-4 flex flex-col gap-2 border-t border-stone-200">
              <Link
                href="/login"
                className="w-full text-center py-2.5 rounded-lg border border-stone-300 text-sm font-semibold text-stone-800"
              >
                {t.nav.signIn}
              </Link>
              <Link
                href="/register"
                className="w-full text-center py-2.5 rounded-lg bg-stone-900 text-white text-sm font-semibold"
              >
                {t.nav.createBusiness}
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="pt-20">
        {/* ── 2. Hero Section Ultrawide (max-w-[1760px]) ── */}
        <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-32 border-b border-stone-200/80 bg-gradient-to-b from-white via-stone-50/50 to-stone-100/50">
          
          <div className="max-w-[1760px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 text-center relative z-10">
            
            {/* Announcement Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-stone-200 text-xs font-semibold text-stone-700 shadow-sm mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{t.hero.badge}</span>
              <ArrowRight />
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-extrabold tracking-tight text-stone-900 leading-[1.08] mb-6 max-w-6xl mx-auto">
              {t.hero.titleMain}<br />
              <span className="text-stone-500 font-medium">{t.hero.titleSub}</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl xl:text-2xl text-stone-600 font-medium max-w-4xl mx-auto leading-relaxed mb-10">
              {t.hero.description}
            </p>

            {/* Hero Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4.5 rounded-full text-base font-semibold bg-stone-900 text-white hover:bg-stone-800 transition-all shadow-md hover:scale-105"
              >
                <span>{t.hero.primaryCta}</span>
                <ArrowRight />
              </Link>
              <a
                href="#demo"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4.5 rounded-full text-base font-semibold bg-white text-stone-800 border border-stone-300 hover:bg-stone-100 transition-all shadow-sm"
              >
                <span>{t.hero.secondaryCta}</span>
              </a>
            </div>

            {/* Sub-hero Trust Bar */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm sm:text-base font-semibold text-stone-500 border-t border-stone-200/80 pt-8 max-w-3xl mx-auto">
              <span>{t.hero.trustFees}</span>
              <span>•</span>
              <span>{t.hero.trustSetup}</span>
              <span>•</span>
              <span>{t.hero.trustCloud}</span>
            </div>

            {/* ── 3. High-Resolution App Preview Card (Ultrawide Span max-w-[1560px]) ── */}
            <div className="mt-16 rounded-3xl bg-white border border-stone-200 shadow-2xl p-6 sm:p-10 text-left max-w-[1560px] mx-auto">
              
              {/* Window Bar */}
              <div className="flex items-center justify-between pb-5 border-b border-stone-100 mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-stone-200"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-stone-200"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-stone-200"></div>
                  <span className="text-xs font-mono text-stone-400 ml-3">{t.showcase.windowUrl}</span>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 py-1 rounded-full font-bold">
                  {t.showcase.statusBadge}
                </span>
              </div>

              {/* Mock Dashboard Grid */}
              <div className="grid lg:grid-cols-12 gap-8 xl:gap-12 items-start">
                
                {/* Left Column: Business Profile Info */}
                <div className="lg:col-span-5 bg-stone-50 p-6 sm:p-8 rounded-2xl border border-stone-200 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-stone-200 flex items-center justify-center text-3xl shadow-sm">
                      🛠️
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900 text-lg">{currentPreset.company}</h4>
                      <p className="text-xs sm:text-sm text-stone-500 font-medium">{t.showcase.publicPageTitle}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-stone-200/80 space-y-3 text-xs sm:text-sm font-medium">
                    <div className="flex justify-between text-stone-600">
                      <span>{t.showcase.agendaStatusLabel}</span>
                      <span className="text-emerald-700 font-bold">{t.showcase.agendaStatusVal}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>{t.showcase.whatsappLabel}</span>
                      <span className="text-stone-900 font-bold">{t.showcase.whatsappVal}</span>
                    </div>
                  </div>

                  {/* Active Promo Box */}
                  <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-5 text-xs sm:text-sm">
                    <div className="flex items-center justify-between text-amber-900 font-bold mb-2">
                      <span className="flex items-center gap-1.5"><Sparkles /> {t.showcase.promoTitle}</span>
                      <span className="bg-amber-200 px-2.5 py-0.5 rounded text-xs">{t.showcase.promoBadge}</span>
                    </div>
                    <p className="text-stone-900 font-bold text-sm mt-1">{currentPreset.promo}</p>
                  </div>
                </div>

                {/* Right Column: Catalog & Order Breakdown */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-stone-50 p-6 sm:p-8 rounded-2xl border border-stone-200 space-y-5">
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                      {t.showcase.previewHeader}
                    </p>

                    <div className="p-5 rounded-2xl bg-white border border-stone-200 flex justify-between items-center text-sm sm:text-base shadow-sm">
                      <div>
                        <p className="font-bold text-stone-900">{currentPreset.mainService}</p>
                        <p className="text-xs sm:text-sm text-stone-500">{t.showcase.mainServiceLabel}</p>
                      </div>
                      <span className="font-extrabold text-stone-900">{currentPreset.mainPrice}</span>
                    </div>

                    <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200 flex justify-between items-center text-sm sm:text-base">
                      <div>
                        <span className="text-[10px] sm:text-xs bg-indigo-600 text-white px-2.5 py-0.5 rounded font-bold mr-2">{t.showcase.extraLabel}</span>
                        <span className="font-bold text-indigo-950">{currentPreset.extraService}</span>
                      </div>
                      <span className="font-extrabold text-indigo-900">{currentPreset.extraPrice}</span>
                    </div>

                    <div className="pt-4 border-t border-stone-200 flex justify-between items-center text-sm sm:text-base font-bold">
                      <span className="text-stone-600">{t.showcase.totalLabel}</span>
                      <span className="text-emerald-700 text-lg sm:text-xl font-black">
                        {lang === "pt" ? "R$ 296,00" : lang === "en" ? "$296.00" : "€ 296,00"}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* ── 4. Como Funciona Ultrawide (max-w-[1760px]) ── */}
        <section id="como-funciona" className="py-24 border-b border-stone-200/80 bg-white">
          <div className="max-w-[1760px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-stone-500 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                {t.workflow.pill}
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-stone-900 mt-3 mb-3">
                {t.workflow.title}
              </h2>
              <p className="text-stone-600 text-base sm:text-lg font-medium">
                {t.workflow.sub}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 xl:gap-10">
              {t.workflow.steps.map((item: any, idx: number) => (
                <div key={idx} className="p-8 rounded-3xl bg-stone-50 border border-stone-200 space-y-4 shadow-sm hover:shadow-md transition-shadow">
                  <span className="text-xs font-mono text-stone-400 font-bold">{item.num}</span>
                  <h3 className="font-bold text-stone-900 text-xl">{item.title}</h3>
                  <p className="text-stone-600 text-sm sm:text-base leading-relaxed font-medium">{item.desc}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ── 5. Segmentos Atendidos Ultrawide ── */}
        <section id="segmentos" className="py-24 border-b border-stone-200/80 bg-stone-50/60">
          <div className="max-w-[1760px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            
            <div className="text-center max-w-3xl mx-auto mb-14">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-stone-900 mb-3">
                {t.industries.title}
              </h2>
              <p className="text-stone-600 text-base sm:text-lg font-medium">
                {t.industries.sub}
              </p>

              {/* Segment Tabs */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
                {t.industries.presets.map((b: any) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedTab(b.id as any)}
                    className={`px-6 py-3 rounded-full text-sm font-bold transition-all ${
                      selectedTab === b.id
                        ? "bg-stone-900 text-white shadow-md scale-105"
                        : "bg-white text-stone-600 hover:text-stone-900 border border-stone-200"
                    }`}
                  >
                    {b.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Segment Detail Box (Ampliado max-w-[1400px]) */}
            <div className="p-8 sm:p-12 rounded-3xl bg-white border border-stone-200 max-w-[1400px] mx-auto shadow-md">
              <div className="space-y-5">
                <span className="text-xs font-mono uppercase text-stone-400 font-bold tracking-wider">
                  {t.industries.exampleLabel}
                </span>
                <h3 className="text-3xl font-bold text-stone-900">{currentPreset.title}</h3>
                <p className="text-stone-600 text-lg leading-relaxed font-medium">{currentPreset.description}</p>
                
                <div className="pt-6 border-t border-stone-100 grid sm:grid-cols-2 gap-8 text-base">
                  <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200">
                    <span className="text-stone-500 block mb-1 text-xs font-semibold">{t.industries.mainServiceLabel}</span>
                    <span className="font-bold text-stone-900">{currentPreset.mainService}</span>
                  </div>
                  <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200">
                    <span className="text-indigo-700 block mb-1 text-xs font-bold">{t.industries.extraServiceLabel}</span>
                    <span className="font-bold text-indigo-950">{currentPreset.extraService}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── 6. Bento Grid de Recursos SaaS (6 Colunas em Screens Ultrawide!) ── */}
        <section id="recursos" className="py-24 border-b border-stone-200/80 bg-white">
          <div className="max-w-[1760px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-stone-500 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                {t.features.pill}
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-stone-900 mt-3 mb-3">
                {t.features.title}
              </h2>
              <p className="text-stone-600 text-base sm:text-lg font-medium">
                {t.features.sub}
              </p>
            </div>

            {/* Grid 3 colunas em Desktop, 6 colunas em telas 2XL/Ultrawide */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-6 xl:gap-8">
              {[
                { icon: <Store />, title: t.features.items[0].title, desc: t.features.items[0].desc },
                { icon: <Plus />, title: t.features.items[1].title, desc: t.features.items[1].desc },
                { icon: <Tag />, title: t.features.items[2].title, desc: t.features.items[2].desc },
                { icon: <FileText />, title: t.features.items[3].title, desc: t.features.items[3].desc },
                { icon: <Calendar />, title: t.features.items[4].title, desc: t.features.items[4].desc },
                { icon: <Shield />, title: t.features.items[5].title, desc: t.features.items[5].desc }
              ].map((item, idx) => (
                <div key={idx} className="p-8 rounded-3xl bg-stone-50 border border-stone-200 space-y-4 hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 shadow-sm flex items-center justify-center mb-6">
                      {item.icon}
                    </div>
                    <h3 className="font-bold text-stone-900 text-lg mb-2">{item.title}</h3>
                    <p className="text-stone-600 text-sm leading-relaxed font-medium">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ── 7. Tabela de Preços Ultrawide ── */}
        <section id="precos" className="py-24 border-b border-stone-200/80 bg-stone-50/50">
          <div className="max-w-[1760px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                {t.pricing.pill}
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-stone-900 mt-3 mb-3">
                {t.pricing.title}
              </h2>
              <p className="text-stone-600 text-base sm:text-lg font-medium">
                {t.pricing.sub}
              </p>

              {/* Billing Toggle */}
              <div className="inline-flex items-center bg-white p-1.5 rounded-full border border-stone-200 mt-8 shadow-sm">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                    billingCycle === "monthly" ? "bg-stone-900 text-white shadow-sm" : "text-stone-600"
                  }`}
                >
                  {t.pricing.monthly}
                </button>
                <button
                  onClick={() => setBillingCycle("annual")}
                  className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
                    billingCycle === "annual" ? "bg-stone-900 text-white shadow-sm" : "text-stone-600"
                  }`}
                >
                  {t.pricing.annual}
                </button>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 xl:gap-10 max-w-[1400px] mx-auto items-stretch">
              
              {/* Starter */}
              <div className="p-8 sm:p-10 rounded-3xl bg-white border border-stone-200 flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                  <h3 className="font-bold text-stone-900 text-2xl">{t.pricing.starter.title}</h3>
                  <p className="text-stone-500 text-sm font-medium">{t.pricing.starter.desc}</p>
                  
                  <div className="my-6">
                    <span className="text-5xl font-extrabold text-stone-900">{t.pricing.starter.price}</span>
                    <span className="text-stone-500 text-sm font-bold">{t.pricing.starter.period}</span>
                  </div>

                  <ul className="space-y-3.5 text-sm sm:text-base text-stone-700 font-medium">
                    {t.pricing.starter.items.map((it: string, i: number) => (
                      <li key={i} className="flex items-center gap-2.5"><Check /> {it}</li>
                    ))}
                  </ul>
                </div>

                <Link
                  href="/register"
                  className="w-full text-center py-4 rounded-xl border border-stone-300 text-sm font-bold text-stone-800 hover:bg-stone-100 transition-colors mt-10"
                >
                  {t.pricing.starter.btn}
                </Link>
              </div>

              {/* Pro (Featured) */}
              <div className="p-8 sm:p-10 rounded-3xl bg-stone-900 text-white border-2 border-stone-900 shadow-2xl flex flex-col justify-between relative scale-105">
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                  {t.pricing.badgePopular}
                </span>

                <div className="space-y-4">
                  <h3 className="font-bold text-white text-2xl">{t.pricing.pro.title}</h3>
                  <p className="text-stone-400 text-sm font-medium">{t.pricing.pro.desc}</p>
                  
                  <div className="my-6">
                    <span className="text-6xl font-black text-white">
                      {billingCycle === "annual" ? t.pricing.pro.priceAnnual : t.pricing.pro.priceMonthly}
                    </span>
                    <span className="text-stone-400 text-sm font-bold">{t.pricing.pro.period}</span>
                  </div>

                  <ul className="space-y-3.5 text-sm sm:text-base text-stone-200 font-medium">
                    {t.pricing.pro.items.map((it: string, i: number) => (
                      <li key={i} className="flex items-center gap-2.5"><Check /> {it}</li>
                    ))}
                  </ul>
                </div>

                <Link
                  href="/register"
                  className="w-full text-center py-4.5 rounded-xl bg-white text-stone-900 text-sm font-extrabold hover:bg-stone-200 transition-all mt-10 shadow-md"
                >
                  {t.pricing.pro.btn}
                </Link>
              </div>

              {/* Multi-Equipe */}
              <div className="p-8 sm:p-10 rounded-3xl bg-white border border-stone-200 flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                  <h3 className="font-bold text-stone-900 text-2xl">{t.pricing.multi.title}</h3>
                  <p className="text-stone-500 text-sm font-medium">{t.pricing.multi.desc}</p>
                  
                  <div className="my-6">
                    <span className="text-5xl font-extrabold text-stone-900">
                      {billingCycle === "annual" ? t.pricing.multi.priceAnnual : t.pricing.multi.priceMonthly}
                    </span>
                    <span className="text-stone-500 text-sm font-bold">{t.pricing.multi.period}</span>
                  </div>

                  <ul className="space-y-3.5 text-sm sm:text-base text-stone-700 font-medium">
                    {t.pricing.multi.items.map((it: string, i: number) => (
                      <li key={i} className="flex items-center gap-2.5"><Check /> {it}</li>
                    ))}
                  </ul>
                </div>

                <Link
                  href="/register"
                  className="w-full text-center py-4 rounded-xl border border-stone-300 text-sm font-bold text-stone-800 hover:bg-stone-100 transition-colors mt-10"
                >
                  {t.pricing.multi.btn}
                </Link>
              </div>

            </div>

          </div>
        </section>

        {/* ── 8. FAQ Accordion Ultrawide ── */}
        <section id="faq" className="py-24 border-b border-stone-200/80 bg-white">
          <div className="max-w-[1760px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-stone-900 mb-3">
                {t.faq.title}
              </h2>
              <p className="text-stone-600 text-base sm:text-lg font-medium">
                {t.faq.sub}
              </p>
            </div>

            <div className="space-y-4 max-w-5xl mx-auto">
              {t.faq.items.map((faq: any, idx: number) => (
                <div key={idx} className="border border-stone-200 rounded-2xl overflow-hidden bg-stone-50/50">
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full text-left p-6 sm:p-7 text-lg font-bold text-stone-900 flex justify-between items-center gap-4 hover:bg-stone-100/60 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className="text-stone-400 text-2xl font-normal">{activeFaq === idx ? "−" : "+"}</span>
                  </button>
                  {activeFaq === idx && (
                    <div className="p-7 pt-2 text-base text-stone-600 leading-relaxed font-medium border-t border-stone-200/60 bg-white">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ── 9. CTA Final Ultrawide ── */}
        <section className="py-28 text-center relative bg-stone-900 text-white overflow-hidden">
          <div className="max-w-[1760px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 relative z-10 space-y-6">
            <h2 className="text-3xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight max-w-5xl mx-auto">
              {t.cta.title}
            </h2>
            <p className="text-stone-300 text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed font-medium">
              {t.cta.sub}
            </p>
            <div className="pt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-12 py-5 rounded-full text-base font-bold bg-white text-stone-900 hover:bg-stone-200 transition-all hover:scale-105 shadow-xl"
              >
                <span>{t.cta.primaryBtn}</span>
                <ArrowRight />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-5 rounded-full text-base font-bold bg-stone-800 text-white border border-stone-700 hover:bg-stone-700 transition-all"
              >
                <span>{t.cta.loginBtn}</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── 10. Footer Minimalista Ultrawide ── */}
      <footer className="border-t border-stone-200/80 py-12 bg-white text-xs sm:text-sm font-medium text-stone-500">
        <div className="max-w-[1760px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-stone-900 text-white font-bold flex items-center justify-center text-xs">a.</div>
            <span className="font-bold text-stone-900 text-base">agendei<span className="text-stone-400">.</span></span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-semibold text-stone-600">
            <a href="#como-funciona" className="hover:text-stone-900 transition-colors">{t.nav.howItWorks}</a>
            <a href="#recursos" className="hover:text-stone-900 transition-colors">{t.nav.features}</a>
            <a href="#precos" className="hover:text-stone-900 transition-colors">{t.nav.pricing}</a>
            <a href="#faq" className="hover:text-stone-900 transition-colors">{t.nav.faq}</a>
          </div>

          <p className="text-stone-500 font-semibold">{t.footer.rights}</p>
        </div>
      </footer>

    </div>
  );
}
