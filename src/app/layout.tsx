import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kreator — Agendamentos online para seu negócio",
  description:
    "Gerencie agendamentos, equipe e pagamentos em um só lugar. Plataforma completa para o seu negócio.",
};

import { ToastProvider } from "@/components/ui/toast-provider";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${inter.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
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
