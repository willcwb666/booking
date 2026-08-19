import type { Metadata } from "next";
import RecuperarSenhaClient from "./recuperar-senha-client";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: "Receba por e-mail um link para criar uma nova senha.",
  robots: { index: false, follow: false },
};

export default function RecuperarSenhaPage() {
  return <RecuperarSenhaClient />;
}
