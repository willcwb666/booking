import { getSystemModulesAction } from "@/server/actions/admin-modules";
import { AddonCatalogClient } from "./catalogo-client";

export const metadata = {
  title: "Catálogo Oficial de Add-ons & Proposta Comercial — Super Admin",
  description: "Catálogo completo de módulos e add-ons adicionais disponíveis para apresentação e exportação em PDF.",
};

export default async function AddonCatalogPage() {
  const res = await getSystemModulesAction();
  const modules = res.modules || [];

  return <AddonCatalogClient modules={modules} />;
}
