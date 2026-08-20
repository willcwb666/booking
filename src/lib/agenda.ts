import "server-only";
import { db } from "@/lib/db";
import { slotRunFrom, startableSlots } from "@/lib/booking-duration";

export type TimeSlot = {
  date: string;      // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
};

type AgendaConfig = {
  startDate: string;
  endDate: string | null;
  workingDays: number[];
  startTime: string;
  endTime: string;
  intervalMinutes: number;
};

export type AgendaExceptionInfo = {
  type: "BLOCKED_DAY" | "CUSTOM_HOURS";
  startTime: string | null;
  endTime: string | null;
};

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function generateSlots(
  config: AgendaConfig,
  targetDate: string,
  exception?: AgendaExceptionInfo | null
): TimeSlot[] {
  if (targetDate < config.startDate) return [];
  if (config.endDate && targetDate > config.endDate) return [];
  if (exception?.type === "BLOCKED_DAY") return [];

  // CUSTOM_HOURS substitui o horário do dia (e abre o dia mesmo fora de workingDays)
  const customHours =
    exception?.type === "CUSTOM_HOURS" && exception.startTime && exception.endTime
      ? { startTime: exception.startTime, endTime: exception.endTime }
      : null;

  if (!customHours) {
    // Parse day-of-week from "YYYY-MM-DD" without timezone issues
    const [year, month, day] = targetDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = date.getUTCDay(); // 0=Sun … 6=Sat

    if (!config.workingDays.includes(dayOfWeek)) return [];
  }

  const [startH, startM] = (customHours?.startTime ?? config.startTime).split(":").map(Number);
  const [endH, endM] = (customHours?.endTime ?? config.endTime).split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const slots: TimeSlot[] = [];
  for (
    let m = startMinutes;
    m + config.intervalMinutes <= endMinutes;
    m += config.intervalMinutes
  ) {
    slots.push({
      date: targetDate,
      startTime: minutesToTime(m),
      endTime: minutesToTime(m + config.intervalMinutes),
    });
  }
  return slots;
}

/**
 * Slots disponíveis de uma agenda ativa em uma data: grade da agenda,
 * menos exceções (dia bloqueado / horário especial), menos slots já
 * reservados pelo profissional (ou por todos os profissionais da equipe),
 * menos horários já passados (quando a data é hoje).
 */
export async function getAvailableSlots(
  agendaId: string,
  date: string,
  professionalId?: string | null
): Promise<TimeSlot[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];

  const agenda = await db.agenda.findFirst({
    where: { id: agendaId, status: "ACTIVE" },
    include: {
      professionals: {
        include: { professional: true },
      },
    },
  });
  if (!agenda) return [];

  const exception = await db.agendaException.findUnique({
    where: { agendaId_date: { agendaId, date } },
    select: { type: true, startTime: true, endTime: true },
  });

  const allSlots = generateSlots(
    {
      startDate: agenda.startDate,
      endDate: agenda.endDate,
      workingDays: agenda.workingDays,
      startTime: agenda.startTime,
      endTime: agenda.endTime,
      intervalMinutes: agenda.intervalMinutes,
    },
    date,
    exception
  );
  if (allSlots.length === 0) return [];

  // Se um profissional específico foi escolhido:
  if (professionalId) {
    const [bookedForProf, scheduleEvents] = await Promise.all([
      db.booking.findMany({
        where: {
          agendaId,
          scheduledDate: date,
          professionalId,
          status: { notIn: ["CANCELLED"] },
        },
        select: { scheduledStartTime: true, scheduledEndTime: true },
      }),
      db.scheduleEvent.findMany({
        where: {
          companyId: agenda.companyId,
          date,
          // Evento SEM profissional é bloqueio da empresa inteira — feriado,
          // dedetização, reunião de equipe. Antes o filtro exigia
          // `professionalId` igual ao escolhido, então esses eventos não
          // batiam com ninguém: o dono cadastrava o feriado, via o bloco na
          // agenda, e a página pública continuava vendendo o dia.
          OR: [{ professionalId }, { professionalId: null }],
        },
        select: { startTime: true, endTime: true },
      }),
    ]);

    /**
     * Ocupação por INTERVALO, não por horário de início.
     *
     * A versão anterior montava um conjunto com `scheduledStartTime` e
     * bloqueava só ele. Um atendimento das 09:00 às 12:00 deixava 10:00 e 11:00
     * à venda — o profissional estava com o cliente na cadeira e o sistema
     * dizia que o horário estava livre.
     *
     * Enquanto todo atendimento cabia num slot da grade, início e intervalo
     * eram a mesma coisa e o defeito não aparecia. Com serviços que ocupam
     * vários slots, aparece na primeira semana.
     */
    const overlapsBooking = (slot: TimeSlot) =>
      bookedForProf.some(
        (b) => slot.startTime < b.scheduledEndTime && slot.endTime > b.scheduledStartTime
      );

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    return allSlots.filter((slot) => {
      // 1. Bloqueio por agendamento existente — o intervalo inteiro dele
      if (overlapsBooking(slot)) return false;

      // 2. Bloqueio por evento externo (Google Calendar / iCal / Bloqueio Manual)
      for (const ev of scheduleEvents) {
        if (slot.startTime < ev.endTime && slot.endTime > ev.startTime) {
          return false;
        }
      }

      // 3. Horário já passado hoje
      if (date === today && slot.startTime <= currentTime) return false;
      return true;
    });
  }

  // Se "Qualquer Profissional" (auto-assignment):
  // Um horário só é bloqueado se TODOS os profissionais ativos da agenda estiverem ocupados naquele horário.
  const activeStaff = agenda.professionals.filter((p) => p.professional.isActive);
  const activeStaffCount = Math.max(1, activeStaff.length);
  const activeProfIds = activeStaff.map((p) => p.professionalId);

  const [bookingsOnDate, externalEventsOnDate] = await Promise.all([
    db.booking.findMany({
      where: {
        agendaId,
        scheduledDate: date,
        status: { notIn: ["CANCELLED"] },
      },
      select: { scheduledStartTime: true, scheduledEndTime: true, professionalId: true },
    }),
    db.scheduleEvent.findMany({
      where: {
        companyId: agenda.companyId,
        date,
        OR: [{ professionalId: { in: activeProfIds } }, { professionalId: null }],
      },
      select: { startTime: true, endTime: true, professionalId: true },
    }),
  ]);

  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  // Bloqueios da empresa inteira: valem para todo mundo, então não entram na
  // contagem de "quantos profissionais estão ocupados" — eles fecham o horário
  // sozinhos, mesmo numa agenda com dez pessoas livres.
  const companyWideEvents = externalEventsOnDate.filter((ev) => ev.professionalId === null);

  return allSlots.filter((slot) => {
    for (const ev of companyWideEvents) {
      if (slot.startTime < ev.endTime && slot.endTime > ev.startTime) return false;
    }

    // Conta quantos profissionais estão ocupados neste slot (seja por booking ou por evento externo)
    let busyProfCount = 0;

    for (const profId of activeProfIds) {
      // Mesmo motivo do ramo acima: compara INTERVALOS, não horários de início.
      const isBooked = bookingsOnDate.some(
        (b) =>
          b.professionalId === profId &&
          slot.startTime < b.scheduledEndTime &&
          slot.endTime > b.scheduledStartTime
      );
      if (isBooked) {
        busyProfCount++;
        continue;
      }

      const hasEvent = externalEventsOnDate.some(
        (ev) => ev.professionalId === profId && slot.startTime < ev.endTime && slot.endTime > ev.startTime
      );
      if (hasEvent) {
        busyProfCount++;
      }
    }

    if (busyProfCount >= activeStaffCount) return false;
    if (date === today && slot.startTime <= currentTime) return false;
    return true;
  });
}

/**
 * Decide qual profissional atende o horário.
 *
 * Com `preferredId`, apenas confirma a escolha. Sem ele (opção "qualquer
 * profissional"), pega o primeiro membro ativo da agenda que ainda não tenha
 * agendamento naquele horário. Devolve `null` quando a agenda não tem equipe —
 * aí o recurso é a própria agenda.
 *
 * A escolha aqui é um palpite otimista: a garantia real contra corrida é o
 * índice único de `booking_slot` (agenda + data + hora + profissional).
 */
export async function resolveProfessionalForSlot(
  agendaId: string,
  date: string,
  startTime: string,
  preferredId?: string | null
): Promise<string | null> {
  if (preferredId) return preferredId;

  const agenda = await db.agenda.findUnique({
    where: { id: agendaId },
    include: {
      professionals: {
        where: { professional: { isActive: true } },
        select: { professionalId: true },
      },
    },
  });

  const staffIds = agenda?.professionals.map((p) => p.professionalId) ?? [];
  if (staffIds.length === 0) return null;

  const busy = await db.booking.findMany({
    where: {
      agendaId,
      scheduledDate: date,
      scheduledStartTime: startTime,
      status: { notIn: ["CANCELLED"] },
      professionalId: { in: staffIds },
    },
    select: { professionalId: true },
  });
  const busyIds = new Set(busy.map((b) => b.professionalId));

  return staffIds.find((id) => !busyIds.has(id)) ?? staffIds[0];
}

/**
 * Chave de profissional usada no índice único de `booking_slot`.
 *
 * NUNCA pode ser NULL: no Postgres dois NULLs são considerados distintos num
 * índice único, o que anularia a trava contra duplo agendamento justamente nas
 * agendas sem equipe. String vazia = "recurso único da agenda".
 */
export function slotProfessionalKey(professionalId: string | null | undefined): string {
  return professionalId ?? "";
}

/**
 * Horários que podem INICIAR um atendimento de `slotsNeeded` slots.
 *
 * A grade bruta responde "este horário está livre?". Um atendimento de 90
 * minutos numa grade de 30 precisa de outra pergunta: "este horário e os dois
 * seguintes estão livres, e são contíguos?". Oferecer o primeiro sem os outros
 * vende um horário que atravessa o almoço ou o cliente seguinte.
 */
export async function getAvailableStartSlots(
  agendaId: string,
  date: string,
  professionalId: string | null | undefined,
  slotsNeeded: number
): Promise<TimeSlot[]> {
  const available = await getAvailableSlots(agendaId, date, professionalId);
  return startableSlots(available, slotsNeeded);
}

/**
 * Valida no servidor um horário enviado pelo cliente: precisa coincidir
 * exatamente com um slot disponível da grade (impede horários arbitrários,
 * overlaps, dias bloqueados e datas fora da agenda).
 *
 * Com `slotsNeeded > 1`, valida a CORRIDA inteira: os N slots existem, são
 * contíguos, e o fim do último é o fim informado. Validar só o primeiro deixaria
 * o navegador escolher onde o atendimento termina.
 */
export async function isSlotAvailable(
  agendaId: string,
  date: string,
  startTime: string,
  endTime: string,
  professionalId?: string | null,
  slotsNeeded = 1
): Promise<boolean> {
  const available = await getAvailableSlots(agendaId, date, professionalId);

  if (slotsNeeded <= 1) {
    return available.some((s) => s.startTime === startTime && s.endTime === endTime);
  }

  const run = slotRunFrom(available, startTime, slotsNeeded);
  return run.length === slotsNeeded && run[run.length - 1].endTime === endTime;
}

/**
 * A corrida de slots que o atendimento vai ocupar — para gravar uma linha de
 * `booking_slot` por slot.
 *
 * Devolve vazio quando a corrida não fecha. Meia reserva é o pior estado
 * possível: o cliente sai achando que marcou e a segunda metade continua à
 * venda.
 */
export async function resolveSlotRun(
  agendaId: string,
  date: string,
  startTime: string,
  professionalId: string | null | undefined,
  slotsNeeded: number
): Promise<TimeSlot[]> {
  const available = await getAvailableSlots(agendaId, date, professionalId);
  return slotRunFrom(available, startTime, Math.max(1, slotsNeeded));
}

/**
 * Mantida por compatibilidade com os call sites de `agendas.ts`, agora sem
 * efeito colateral.
 *
 * O cache que ela limpava (`slots:<agenda>:<data>`) era escrito por
 * `getCachedSlots`, uma função que nenhum lugar do código chamava:
 * `getAvailableSlots` sempre calculou a grade direto. Ou seja, a invalidação
 * rodava um `KEYS` — comando O(N) que percorre o keyspace INTEIRO e bloqueia
 * o Redis, que é single-threaded — para apagar chaves que ninguém lia.
 *
 * Como o Redis também serve os rate limits, essa varredura travava a
 * proteção de login junto. Cache de grade, se voltar, deve guardar um
 * índice próprio de chaves ou usar SCAN com cursor — nunca KEYS.
 */
export async function invalidateSlotCache(_agendaId: string): Promise<void> {
  // Sem operação: não há mais cache de grade para invalidar.
}
