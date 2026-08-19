import { getSuperAdminReportsAction } from "@/server/actions/reports";
import { AdminRelatoriosClient } from "./relatorios-client";

export default async function AdminRelatoriosPage() {
  const res = await getSuperAdminReportsAction();

  // Antes a página passava `res.reports` direto e o cliente fazia
  // `if (!reports) return null` — acesso negado ou falha na consulta
  // renderizava uma tela em branco, sem nenhuma explicação.
  if (!res.success || !res.reports) {
    return (
      <div className="page-content">
        <div className="alert alert-danger">
          <span>{res.error ?? "Não foi possível carregar os relatórios."}</span>
        </div>
      </div>
    );
  }

  return <AdminRelatoriosClient reports={res.reports} />;
}
