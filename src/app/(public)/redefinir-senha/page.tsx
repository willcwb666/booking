import type { Metadata } from "next";
import RedefinirSenhaClient from "./redefinir-senha-client";

export const metadata: Metadata = {
  title: "Criar nova senha",
  description: "Defina uma nova senha para a sua conta.",
  robots: { index: false, follow: false },
};

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  return <RedefinirSenhaClient token={token ?? null} linkError={error ?? null} />;
}
