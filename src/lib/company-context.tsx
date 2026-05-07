"use client";

import { createContext, useContext } from "react";

export type CompanyContext = {
  id: string;
  name: string;
  slug: string;
  businessType: string;
  planTier: string;
  planDisplayName: string;
  role: "OWNER" | "MANAGER" | "EMPLOYEE";
};

const CompanyCtx = createContext<CompanyContext | null>(null);

export function CompanyProvider({
  company,
  children,
}: {
  company: CompanyContext;
  children: React.ReactNode;
}) {
  return <CompanyCtx.Provider value={company}>{children}</CompanyCtx.Provider>;
}

export function useCompany(): CompanyContext {
  const ctx = useContext(CompanyCtx);
  if (!ctx) throw new Error("useCompany must be used inside CompanyProvider");
  return ctx;
}
