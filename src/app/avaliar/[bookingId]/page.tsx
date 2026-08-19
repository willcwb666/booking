import { getReviewLinkInfoAction } from "@/server/actions/review-request";
import { AvaliarClient } from "./avaliar-client";

export const metadata = {
  title: "Avaliar atendimento",
  // Página de link privado — não deve entrar em índice de busca.
  robots: { index: false, follow: false },
};

export default async function AvaliarPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ t?: string; e?: string }>;
}) {
  const { bookingId } = await params;
  const { t = "", e = "" } = await searchParams;

  // Sem sessão de propósito: quem agenda numa barbearia raramente cria conta.
  // O token assinado no link faz o papel da sessão, como no check-in.
  const info = await getReviewLinkInfoAction(bookingId, t, e);

  return <AvaliarClient bookingId={bookingId} token={t} expires={e} info={info} />;
}
