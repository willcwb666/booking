import React from "react";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatMoney } from "@/lib/format";
import { ReceiptActions } from "./_components/receipt-actions";
import { ExtraItemInput } from "@/server/actions/booking";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      company: true,
      bookingConfig: true,
      customerDetail: true,
      estimate: {
        include: {
          serviceTypes: {
            include: { serviceType: true },
          },
          extraServices: {
            include: { extraService: true },
          },
        },
      },
    },
  });

  if (!booking || !booking.customerDetail) {
    notFound();
  }

  const comp = booking.company;
  const cd = booking.customerDetail;
  const currency = comp.currency;
  const locale = comp.locale;
  const totalAmount = Number(booking.estimate?.total ?? 0);
  const subtotalAmount = Number(booking.estimate?.subtotal ?? totalAmount);

  // Parsing de ajustes adicionais e descontos registrados no fechamento
  let additionalItems: ExtraItemInput[] = [];
  let discountInfo: { amount: number; reason: string } | null = null;

  if (booking.estimate?.notes) {
    try {
      const parsed = JSON.parse(booking.estimate.notes);
      if (Array.isArray(parsed.additionalItems)) {
        additionalItems = parsed.additionalItems;
      }
      if (parsed.discount && typeof parsed.discount.amount === "number") {
        discountInfo = parsed.discount;
      }
    } catch {
      // Notas em formato texto legado
    }
  }

  // Agrupamento de taxas vinculadas vs produtos avulsos
  const getLinkedSurcharges = (serviceName: string) => {
    return additionalItems.filter(
      (item) => item.parentServiceName === serviceName || (item.category === "SURCHARGE" && !item.parentServiceName)
    );
  };

  const standaloneProducts = additionalItems.filter(
    (item) => item.category === "PRODUCT" || (!item.parentServiceName && item.category !== "SURCHARGE")
  );

  const formattedTotal = formatMoney(totalAmount, currency, locale);

  return (
    <div className="min-h-screen bg-stone-100 p-4 sm:p-8 flex justify-center text-stone-900 print:bg-white print:p-0 font-sans">
      <div className="max-w-2xl w-full bg-white rounded-3xl border border-stone-200 shadow-xl p-8 space-y-8 print:shadow-none print:border-none print:rounded-none">
        
        {/* Header / Logo */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-stone-900">{comp.name}</h1>
            {comp.address && <p className="text-xs text-stone-500">{comp.address}</p>}
            {comp.phone && <p className="text-xs text-stone-500">Tel: {comp.phone}</p>}
          </div>

          <div className="text-right">
            <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-1">
              {booking.status === "COMPLETED" ? "Serviço Concluído & Pago" : booking.status}
            </span>
            <p className="text-xs text-stone-400 font-mono">Recibo #{booking.id.slice(-8)}</p>
            <p className="text-xs text-stone-500 mt-1">Data: {booking.scheduledDate.split("-").reverse().join("/")}</p>
          </div>
        </div>

        {/* Customer Details */}
        <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-stone-400 font-bold uppercase tracking-wider block mb-1">Cliente</span>
            <p className="font-bold text-stone-900 text-sm">{cd.firstName} {cd.lastName}</p>
            <p className="text-stone-600">{cd.email}</p>
            <p className="text-stone-600">{cd.phone}</p>
          </div>
          <div>
            <span className="text-stone-400 font-bold uppercase tracking-wider block mb-1">Detalhes do Atendimento</span>
            <p className="font-medium text-stone-800">{comp.name}</p>
            {cd.address && <p className="text-stone-600">{cd.address} {cd.aptNo ? `, ${cd.aptNo}` : ""}</p>}
            <p className="text-stone-500 mt-1">Horário: {booking.scheduledStartTime} – {booking.scheduledEndTime}</p>
          </div>
        </div>

        {/* Discriminativo Completo de Itens */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">Discriminativo dos Serviços & Produtos</h2>
          
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-stone-400 font-bold uppercase">
                <th className="py-2">Item / Descrição</th>
                <th className="py-2 text-center w-16">Qtd</th>
                <th className="py-2 text-right">Valor Unit.</th>
                <th className="py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {/* Serviços Principais */}
              {booking.estimate?.serviceTypes && booking.estimate.serviceTypes.length > 0 ? (
                booking.estimate.serviceTypes.map((st) => {
                  const surcharges = getLinkedSurcharges(st.serviceType.name);
                  return (
                    <React.Fragment key={st.id}>
                      <tr>
                        <td className="py-3 font-bold text-stone-900">
                          <span>{st.serviceType.name}</span>
                          {st.serviceType.description && (
                            <p className="text-[11px] text-stone-400 font-normal">{st.serviceType.description}</p>
                          )}
                        </td>
                        <td className="py-3 text-center text-stone-500">{st.quantity}</td>
                        <td className="py-3 text-right text-stone-600">{formatMoney(Number(st.unitPrice), currency, locale)}</td>
                        <td className="py-3 text-right font-bold text-stone-900">{formatMoney(Number(st.subtotal), currency, locale)}</td>
                      </tr>
                      {/* Taxas adicionais vinculadas a este serviço */}
                      {surcharges.map((sur, sIdx) => (
                        <tr key={`sur-${st.id}-${sIdx}`} className="bg-violet-50/50">
                          <td className="py-2 pl-6 text-violet-900 font-medium" colSpan={3}>
                            <span className="flex items-center gap-1.5">
                              <span className="text-violet-400 font-mono">↳</span>
                              <span>{sur.description}</span>
                            </span>
                          </td>
                          <td className="py-2 text-right font-bold text-violet-900">
                            +{formatMoney(sur.amount, currency, locale)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td className="py-3 font-semibold text-stone-800">{booking.bookingConfig.name} (Serviço Base)</td>
                  <td className="py-3 text-center text-stone-500">1</td>
                  <td className="py-3 text-right text-stone-600">{formatMoney(subtotalAmount, currency, locale)}</td>
                  <td className="py-3 text-right font-bold text-stone-900">{formatMoney(subtotalAmount, currency, locale)}</td>
                </tr>
              )}

              {/* Extras Agendados */}
              {booking.estimate?.extraServices && booking.estimate.extraServices.map((ex) => {
                const surcharges = getLinkedSurcharges(ex.extraService.name);
                return (
                  <React.Fragment key={ex.id}>
                    <tr className="bg-stone-50/40">
                      <td className="py-3 font-semibold text-stone-800">
                        <span>✨ {ex.extraService.name} (Adicional)</span>
                      </td>
                      <td className="py-3 text-center text-stone-500">{ex.quantity}</td>
                      <td className="py-3 text-right text-stone-600">{formatMoney(Number(ex.unitPrice), currency, locale)}</td>
                      <td className="py-3 text-right font-bold text-stone-900">{formatMoney(Number(ex.subtotal), currency, locale)}</td>
                    </tr>
                    {/* Taxas adicionais vinculadas a este extra */}
                    {surcharges.map((sur, sIdx) => (
                      <tr key={`sur-ex-${ex.id}-${sIdx}`} className="bg-violet-50/50">
                        <td className="py-2 pl-6 text-violet-900 font-medium" colSpan={3}>
                          <span className="flex items-center gap-1.5">
                            <span className="text-violet-400 font-mono">↳</span>
                            <span>{sur.description}</span>
                          </span>
                        </td>
                        <td className="py-2 text-right font-bold text-violet-900">
                          +{formatMoney(sur.amount, currency, locale)}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}

              {/* Produtos / Bebidas / Balcão */}
              {standaloneProducts.map((item, idx) => (
                <tr key={`prod-${idx}`} className="bg-amber-50/30">
                  <td className="py-3 font-semibold text-stone-800" colSpan={3}>
                    <span>🛒 {item.description} (Produto / Balcão)</span>
                  </td>
                  <td className="py-3 text-right font-bold text-stone-900">
                    +{formatMoney(item.amount, currency, locale)}
                  </td>
                </tr>
              ))}

              {/* Desconto Aplicado */}
              {discountInfo && (
                <tr className="bg-emerald-50/60 text-emerald-900 font-semibold border-t-2 border-emerald-100">
                  <td className="py-3" colSpan={3}>
                    <span className="flex items-center gap-1.5">
                      <span>🏷️</span>
                      <span>Desconto Aplicado: {discountInfo.reason}</span>
                    </span>
                  </td>
                  <td className="py-3 text-right font-bold text-emerald-700">
                    -{formatMoney(discountInfo.amount, currency, locale)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Total Final */}
        <div className="border-t-2 border-stone-900 pt-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-500 block">Forma de Pagamento: {booking.paymentMethod ?? "PIX / CARTÃO"}</span>
            <span className="text-xs text-emerald-600 font-bold">Status: CONFIRMADO / PAGO</span>
          </div>

          <div className="text-right">
            <span className="text-xs text-stone-500 uppercase font-bold block">Total Pago Final</span>
            <span className="text-2xl font-black text-emerald-600">
              {formattedTotal}
            </span>
          </div>
        </div>

        {/* Actions (Imprimir PDF / WhatsApp) */}
        <ReceiptActions
          bookingId={booking.id}
          companyName={comp.name}
          totalFormatted={formattedTotal}
          customerPhone={cd.phone}
          customerName={`${cd.firstName} ${cd.lastName}`}
        />

      </div>
    </div>
  );
}
