import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatMoney } from "@/lib/format";

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
      estimate: true,
    },
  });

  if (!booking || !booking.customerDetail) {
    notFound();
  }

  const comp = booking.company;
  const cd = booking.customerDetail;
  const currency = comp.currency;
  const totalAmount = Number(booking.estimate?.total ?? 0);

  return (
    <div className="min-h-screen bg-stone-100 p-4 sm:p-8 flex justify-center text-stone-900 print:bg-white print:p-0">
      <div className="max-w-2xl w-full bg-white rounded-3xl border border-stone-200 shadow-xl p-8 space-y-8 print:shadow-none print:border-none print:rounded-none">
        
        {/* Header / Logo */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-stone-900">{comp.name}</h1>
            {comp.address && <p className="text-xs text-stone-500">{comp.address}</p>}
            {comp.phone && <p className="text-xs text-stone-500">Tel: {comp.phone}</p>}
          </div>

          <div className="text-right">
            <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-1">
              {booking.status === "COMPLETED" ? "Serviço Concluído & Pago" : booking.status}
            </span>
            <p className="text-xs text-stone-400 font-mono">Recibo #{booking.id.slice(-8)}</p>
            <p className="text-xs text-stone-500 mt-1">Data: {booking.scheduledDate}</p>
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
            <span className="text-stone-400 font-bold uppercase tracking-wider block mb-1">Local do Atendimento</span>
            <p className="font-medium text-stone-800">{cd.address} {cd.aptNo ? `, ${cd.aptNo}` : ""}</p>
            <p className="text-stone-600">{cd.city} - {cd.zip}</p>
            <p className="text-stone-500 mt-1">Horário: {booking.scheduledStartTime} – {booking.scheduledEndTime}</p>
          </div>
        </div>

        {/* Discriminativo */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">Discriminativo dos Serviços</h2>
          
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-stone-400 font-bold uppercase">
                <th className="py-2">Item / Descrição</th>
                <th className="py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              <tr>
                <td className="py-3 font-semibold text-stone-800">
                  {booking.bookingConfig.name} (Serviço Base)
                </td>
                <td className="py-3 text-right font-bold text-stone-900">
                  {currency} {totalAmount.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Total Final */}
        <div className="border-t-2 border-stone-900 pt-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-500 block">Forma de Pagamento: {booking.paymentMethod}</span>
            <span className="text-xs text-emerald-600 font-bold">Status: CONFIRMADO / PAGO</span>
          </div>

          <div className="text-right">
            <span className="text-xs text-stone-500 uppercase font-bold block">Total Pago</span>
            <span className="text-2xl font-black text-emerald-600">
              {currency} {totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Printable Button (oculto no print) */}
        <div className="pt-6 border-t border-stone-200 flex justify-center print:hidden">
          <button
            onClick={() => window.print()}
            className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2"
          >
            <span>🖨️</span>
            <span>Imprimir / Salvar em PDF</span>
          </button>
        </div>

      </div>
    </div>
  );
}
