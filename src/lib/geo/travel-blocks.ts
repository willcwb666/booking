import "server-only";
import { db } from "@/lib/db";
import { formatDistance } from "./haversine";
import { geocodeAddress } from "./geocode";
import { computeTravelBlocks, travelBlockTitle, type Stop } from "./drive-time";

/**
 * Grava os bloqueios de deslocamento na agenda.
 *
 * ─── Por que ScheduleEvent e não uma tabela nova ─────────────────────────────
 *
 * `ScheduleEvent` já é o bloqueio da agenda: já aparece na tela de horários,
 * já é filtrado por `getAvailableSlots`, já pode ser apagado pelo dono. Uma
 * tabela própria para o buffer significaria ensinar as mesmas três coisas a um
 * segundo lugar — e a lição do split de comissão nesta base foi exatamente
 * essa: três fontes de verdade viraram uma porque duas estavam sempre
 * desatualizadas.
 *
 * O buffer nasce, então, como um evento de `source = "DRIVE_TIME"`. Visível e
 * editável sem uma linha de tela nova, que é o que a ficha pedia.
 *
 * ─── O bloco apagado à mão fica apagado ──────────────────────────────────────
 *
 * O dono que apaga um bloqueio está dizendo "hoje eu chego". A recomposição só
 * roda quando o dia daquele profissional MUDA — agendamento novo, cancelado ou
 * remarcado. Aí a premissa dele mudou junto, e recalcular é o certo. Enquanto
 * o dia for o mesmo, a decisão dele vale.
 *
 * ─── Só com profissional ─────────────────────────────────────────────────────
 *
 * Agendamento sem profissional atribuído não gera bloqueio. Não é limitação
 * técnica: `getAvailableSlots` filtra eventos POR profissional, então um
 * evento sem dono não bloquearia horário nenhum. Gravá-lo criaria um bloco que
 * aparece na tela e não protege nada — pior que não ter.
 */

const SOURCE = "DRIVE_TIME";

/**
 * Resolve e guarda as coordenadas do endereço de um agendamento.
 *
 * Roda uma vez por agendamento. Devolve `false` sem barulho quando não há o
 * que fazer: empresa sem o recurso ligado, endereço já resolvido, ou
 * geocodificador sem resposta.
 */
export async function geocodeBookingAddress(bookingId: string): Promise<boolean> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      company: { select: { driveTimeEnabled: true } },
      customerDetail: {
        select: { id: true, address: true, city: true, zip: true, latitude: true, longitude: true },
      },
    },
  });

  const detail = booking?.customerDetail;
  if (!booking?.company.driveTimeEnabled || !detail) return false;
  if (detail.latitude !== null && detail.longitude !== null) return false;

  const coords = await geocodeAddress({
    address: detail.address,
    city: detail.city,
    zip: detail.zip,
  });
  if (!coords) return false;

  await db.bookingCustomerDetail.update({
    where: { id: detail.id },
    data: { latitude: coords.latitude, longitude: coords.longitude },
  });
  return true;
}

/**
 * Recalcula os bloqueios de um profissional em uma data.
 *
 * Apaga e refaz em transação: o estado intermediário — bloqueios antigos já
 * removidos, novos ainda não gravados — é uma janela em que a agenda venderia
 * horário que não existe.
 */
export async function refreshTravelBlocks(
  companyId: string,
  professionalId: string | null,
  date: string
): Promise<void> {
  if (!professionalId) return;

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: {
      driveTimeEnabled: true,
      driveTimeMinutesPerKm: true,
      driveTimeMaxMinutes: true,
    },
  });
  if (!company) return;

  // Desligar o recurso tem de limpar o que ele deixou. Sem isso, a empresa que
  // experimenta e desiste fica com bloqueios órfãos que ninguém sabe explicar.
  if (!company.driveTimeEnabled) {
    await db.scheduleEvent.deleteMany({
      where: { companyId, professionalId, date, source: SOURCE },
    });
    return;
  }

  const bookings = await db.booking.findMany({
    where: {
      companyId,
      professionalId,
      scheduledDate: date,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
    select: {
      scheduledStartTime: true,
      scheduledEndTime: true,
      customerDetail: { select: { latitude: true, longitude: true } },
    },
  });

  const stops: Stop[] = bookings.map((b) => ({
    startTime: b.scheduledStartTime,
    endTime: b.scheduledEndTime,
    latitude: b.customerDetail?.latitude ?? null,
    longitude: b.customerDetail?.longitude ?? null,
  }));

  const blocks = computeTravelBlocks(stops, {
    minutesPerKm: company.driveTimeMinutesPerKm,
    maxMinutes: company.driveTimeMaxMinutes,
  });

  await db.$transaction(async (tx) => {
    await tx.scheduleEvent.deleteMany({
      where: { companyId, professionalId, date, source: SOURCE },
    });
    if (blocks.length === 0) return;
    await tx.scheduleEvent.createMany({
      data: blocks.map((block) => ({
        companyId,
        professionalId,
        date,
        startTime: block.startTime,
        endTime: block.endTime,
        title: travelBlockTitle(block, formatDistance),
        type: "EVENT" as const,
        source: SOURCE,
        notes: block.insufficient
          ? "A viagem estimada não cabe na janela entre os dois atendimentos."
          : null,
      })),
    });
  });
}

/**
 * Geocodifica o endereço do agendamento e recalcula o dia do profissional.
 *
 * Engole os próprios erros de propósito. É chamada depois do agendamento já
 * gravado, e nenhuma falha aqui — provedor fora do ar, transação em conflito —
 * pode transformar um agendamento bem-sucedido em erro na tela do cliente.
 */
export async function syncTravelBlocksForBooking(bookingId: string): Promise<void> {
  try {
    // Uma consulta antes de qualquer outra coisa. Esta função roda em TODO
    // agendamento da plataforma, e a esmagadora maioria das empresas atende no
    // balcão e nunca vai ligar a reserva de viagem — para elas o custo do
    // recurso precisa ser uma leitura, não meia dúzia de idas ao banco.
    //
    // Sair cedo aqui não deixa lixo para trás: quem desliga o recurso passa
    // por `saveDriveTimeSettingsAction`, que recalcula os dias futuros e é
    // onde os bloqueios órfãos são varridos.
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: {
        companyId: true,
        professionalId: true,
        scheduledDate: true,
        company: { select: { driveTimeEnabled: true } },
      },
    });
    if (!booking?.company.driveTimeEnabled) return;

    await geocodeBookingAddress(bookingId);
    await refreshTravelBlocks(booking.companyId, booking.professionalId, booking.scheduledDate);
  } catch (err) {
    console.error("[travel-blocks] falha ao sincronizar", bookingId, err);
  }
}

/** Recalcula sem deixar o erro subir — para os pontos de cancelamento e remarcação. */
export async function safeRefreshTravelBlocks(
  companyId: string,
  professionalId: string | null,
  date: string
): Promise<void> {
  try {
    await refreshTravelBlocks(companyId, professionalId, date);
  } catch (err) {
    console.error("[travel-blocks] falha ao recalcular", companyId, professionalId, date, err);
  }
}
