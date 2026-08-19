import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";

// Duas famílias, papéis fixos (ver regra 1 em globals.css):
// Geist carrega a interface; Geist Mono carrega dado — dinheiro, horário,
// identificador — onde os dígitos precisam alinhar em coluna.
// `next/font` auto-hospeda os arquivos: zero requisição a fonts.gstatic.com,
// sem flash de fonte e sem terceiro no caminho crítico.
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

import { ToastProvider } from "@/components/ui/toast-provider";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kreator.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Kreator — Agendamentos online e orçamentos para seu negócio",
    template: "%s | Kreator",
  },
  description:
    "Gerencie agendamentos, equipe, serviços extras e orçamentos em um só lugar. A plataforma completa para oficinas, barbearias, clínicas e prestadores de serviços.",
  keywords: [
    "agendamento online",
    "sistema para barbearia",
    "software oficina mecanica",
    "orcamento whatsapp",
    "agenda inteligente",
    "agendamento de servicos",
  ],
  authors: [{ name: "Kreator" }],
  creator: "Kreator",
  publisher: "Kreator",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    title: "Kreator — Agendamentos online e orçamentos para seu negócio",
    description:
      "Plataforma completa para prestadores de serviços. Automatize sua agenda, lance promoções e aumente suas vendas sem taxas por agendamento.",
    siteName: "Kreator",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kreator — Agendamentos online e orçamentos para seu negócio",
    description:
      "Plataforma completa para prestadores de serviços. Automatize sua agenda, lance promoções e aumente suas vendas sem taxas por agendamento.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className={`${geist.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/*
          Aplica o tema ANTES da primeira pintura. Sem isto, o switcher só age
          no useEffect e o usuário vê a interface piscar do padrão para a
          preferência dele a cada navegação.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("kreator_theme");
if(t&&t!=="default")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {/* Primeiro Tab da página pula direto para o conteúdo */}
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>
        <GoogleAnalytics />
        <NextIntlClientProvider>
          <ToastProvider>
            {children}
            <ThemeSwitcher />
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
