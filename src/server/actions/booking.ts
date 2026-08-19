"use server";

import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { encrypt } from "@/lib/encrypt";
import { decrypt } from "@/lib/encrypt";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { notifyBookingCompletedWithInvoice } from "@/lib/notifications";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createPixPayment } from "@/lib/mercadopago";
import { triggerWebhooks } from "@/lib/webhooks";
import { createCalendarEvent } from "@/lib/google-calendar";
import { isSlotAvailable, resolveProfessionalForSlot, slotProfessionalKey } from "@/lib/agenda";
import { calculateCancellationRefund, computeBookingCharge, roundMoney, toStripeCents } from "@/lib/pricing";
import { notifyWaitlistForDate } from "@/lib/waitlist-notify";
import { randomUUID } from "crypto";
import { enqueueNotification } from "@/lib/notification-outbox";

type CreateResult =
  | { success: true; bookingId: string; paymentMethod: "CASH_CHECK" }
  | { success: true; bookingId: string; paymentMethod: "CARD"; clientSecret: string }
  | { success: true; bookingId: string; paymentMethod: "PIX"; pixQrCode: string; pixQrCodeBase64: string }
  | { success: false; errors: Record<string, string[]> };

type CancelResult =
  | { success: true }
  | { success: false; errors: Record<string, string[]> };

export async function createBookingAction(formData: FormData): Promise<CreateResult> {
  // Rate limit: 10 bookings per minute per IP
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await enforceRateLimit(RATE_LIMITS.BOOKING_CREATE, ip);
  if (!rl.allowed) {
    return { success: false, errors: { _: ["Muitas tentativas. Aguarde um momento."] } };
  }

  const estimateId = formData.get("estimateId") as string;
  const agendaId = formData.get("agendaId") as string;
  const scheduledDate = formData.get("scheduledDate") as string;
  const scheduledStartTime = formData.get("scheduledStartTime") as string;
  const scheduledEndTime = formData.get("scheduledEndTime") as string;
  const paymentMethodRaw = formData.get("paymentMethod") as string;
  const chosenMethodId = (formData.get("companyPaymentMethodId") as string) || null;

  // Customer details
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const sendReminders = formData.get("sendReminders") === "true";
  const address = formData.get("address") as string;
  const aptNo = (formData.get("aptNo") as string) || null;
  const city = formData.get("city") as string;
  const zip = formData.get("zip") as string;
  const giftCardCode = (formData.get("giftCardCode") as string)?.trim() || null;

  // Home access
  const accessType = (formData.get("accessType") as string) || "someone_home";
  const keepKeyWithProvider = formData.get("keepKeyWithProvider") === "true";
  const accessNotePlain = (formData.get("accessNote") as string) || null;
  const additionalNote = (formData.get("additionalNote") as string) || null;

  // Validate required fields
  if (!estimateId || !agendaId || !scheduledDate || !scheduledStartTime || !scheduledEndTime) {
    return { success: false, errors: { _: ["Dados de agendamento incompletos"] } };
  }
  if (!firstName || !lastName || !email || !phone || !address || !city || !zip) {
    return { success: false, errors: { _: ["Preencha todos os campos obrigatórios"] } };
  }

  // Load estimate
  const estimate = await db.estimate.findFirst({
    where: { id: estimateId, status: "PENDING" },
    include: { bookingConfig: true, company: { select: { currency: true } } },
  });
  if (!estimate) {
    return { success: false, errors: { _: ["Orçamento não encontrado ou expirado"] } };
  }

  // Resolve a forma de pagamento configurada (nova) ou o enum legado.
  // O fluxo (Stripe / MP PIX / manual) é derivado do kind do método — nunca
  // de string livre do cliente.
  let chosenMethod = null;
  if (chosenMethodId) {
    chosenMethod = await db.companyPaymentMethod.findFirst({
      where: { id: chosenMethodId, companyId: estimate.companyId, isActive: true },
    });
    if (!chosenMethod) {
      return { success: false, errors: { _: ["Forma de pagamento inválida"] } };
    }
  }

  const paymentMethod = chosenMethod
    ? chosenMethod.kind === "STRIPE_CARD"
      ? "CARD"
      : chosenMethod.kind === "MERCADOPAGO_PIX"
        ? "PIX"
        : "CASH_CHECK"
    : paymentMethodRaw === "CARD"
      ? "CARD"
      : paymentMethodRaw === "PIX"
        ? "PIX"
        : "CASH_CHECK";

  // Verify agenda belongs to this booking config
  if (estimate.bookingConfig.agendaId !== agendaId) {
    return { success: false, errors: { _: ["Agenda inválida para este agendamento"] } };
  }
  const agenda = await db.agenda.findFirst({
    where: { id: agendaId, status: "ACTIVE" },
  });
  if (!agenda) {
    return { success: false, errors: { _: ["Agenda não encontrada"] } };
  }

  const chosenProfessionalId = (formData.get("professionalId") as string) || null;

  // Server-side slot validation: o horário precisa coincidir com um slot
  // disponível da grade (bloqueia horários arbitrários, overlaps, dias
  // bloqueados e datas fora da agenda)
  const slotOk = await isSlotAvailable(
    agendaId,
    scheduledDate,
    scheduledStartTime,
    scheduledEndTime,
    chosenProfessionalId
  );
  if (!slotOk) {
    return { success: false, errors: { _: ["Horário indisponível. Por favor, escolha outro horário."] } };
  }

  // Validação de Política Anti-No-Show e Bloqueio de Clientes
  const companyPolicy = await db.company.findUnique({
    where: { id: estimate.companyId },
    select: { maxAllowedNoShows: true },
  });

  const existingCustomer = await db.customer.findUnique({
    where: {
      companyId_email: {
        companyId: estimate.companyId,
        email: email.toLowerCase().trim(),
      },
    },
    select: { noShowCount: true },
  });

  const maxNoShows = companyPolicy?.maxAllowedNoShows ?? 2;
  if (existingCustomer && existingCustomer.noShowCount >= maxNoShows) {
    return {
      success: false,
      errors: {
        _: [
          `Agendamento online bloqueado: limite de ${maxNoShows} falta(s) sem aviso atingido. Entre em contato diretamente com a empresa.`,
        ],
      },
    };
  }

  const accessNote = accessNotePlain ? encrypt(accessNotePlain) : null;

  // Determine initial status
  const bookingStatus = paymentMethod === "CASH_CHECK" ? "CONFIRMED" : "PENDING";

  // Fetch company payment settings (needed for PIX)
  const paymentSettings = await db.companyPaymentSettings.findUnique({
    where: { companyId: estimate.companyId },
  });

  // Validate PIX availability (PIX automático exige token do Mercado Pago;
  // com método configurado o isActive já foi validado, senão vale o flag legado)
  if (paymentMethod === "PIX") {
    const pixEnabled = chosenMethod ? true : paymentSettings?.enablePix;
    if (!pixEnabled || !paymentSettings?.mercadoPagoAccessToken) {
      return { success: false, errors: { _: ["PIX não disponível para esta empresa"] } };
    }
  }

  // Recurrence setup
  const rawFrequency = estimate.frequency;
  const recurrenceGroupId = rawFrequency !== "ONCE" ? randomUUID() : null;
  const recurrenceFrequency = rawFrequency !== "ONCE" ? rawFrequency : null;

  // Resolução do profissional atribuído (específico ou auto-assignment).
  // A garantia contra corrida não está aqui e sim no índice único de
  // `booking_slot`, que aborta a transação se o horário já foi vendido.
  const finalProfessionalId = await resolveProfessionalForSlot(
    agendaId,
    scheduledDate,
    scheduledStartTime,
    chosenProfessionalId
  );

  try {
    const { newBooking, membershipCovered, membershipDiscount, giftCardDebit } =
      await db.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          companyId: estimate.companyId,
          estimateId,
          bookingConfigId: estimate.bookingConfigId,
          agendaId,
          professionalId: finalProfessionalId,
          scheduledDate,
          scheduledStartTime,
          scheduledEndTime,
          status: bookingStatus,
          paymentMethod,
          paymentStatus: "PENDING",
          companyPaymentMethodId: chosenMethod?.id ?? null,
          recurrenceGroupId,
          recurrenceFrequency,
        },
      });

      // Trava atômica do horário: pode lançar P2002 se o MESMO profissional já
      // estiver ocupado nesse slot — intencional, é o que impede duplo
      // agendamento em corrida. Outros profissionais da agenda seguem livres.
      await tx.bookingSlot.create({
        data: {
          bookingId: newBooking.id,
          agendaId,
          date: scheduledDate,
          startTime: scheduledStartTime,
          endTime: scheduledEndTime,
          professionalId: slotProfessionalKey(finalProfessionalId),
        },
      });

      await tx.bookingCustomerDetail.create({
        data: {
          bookingId: newBooking.id,
          firstName,
          lastName,
          email,
          phone,
          sendReminders,
          address,
          aptNo,
          city,
          zip,
        },
      });

      await tx.bookingHomeAccess.create({
        data: {
          bookingId: newBooking.id,
          accessType,
          keepKeyWithProvider,
          accessNote,
          additionalNote,
        },
      });

      await tx.estimate.update({
        where: { id: estimateId },
        data: { status: "CONVERTED" },
      });

      // Upsert e vinculação da entidade Customer de alta performance
      try {
        const normalizedEmail = email.toLowerCase().trim();
        const customer = await tx.customer.upsert({
          where: {
            companyId_email: {
              companyId: estimate.companyId,
              email: normalizedEmail,
            },
          },
          update: {
            firstName,
            lastName,
            phone,
            city,
            totalBookings: { increment: 1 },
            lastBookingDate: scheduledDate,
          },
          create: {
            companyId: estimate.companyId,
            email: normalizedEmail,
            firstName,
            lastName,
            phone,
            city,
            totalBookings: 1,
            lastBookingDate: scheduledDate,
          },
        });

        await tx.booking.update({
          where: { id: newBooking.id },
          data: { customerId: customer.id },
        });
      } catch (custErr) {
        console.error("[createBookingAction] Falha ao upsertar Customer:", custErr);
      }

      // ── Clube de Assinaturas / Pacotes: cobertura + débito atômico ──
      // Erros aqui NÃO são engolidos: propagam e revertem a transação, para
      // nunca criar um booking cujo débito ficou inconsistente.
      let membershipCovered = false;
      let membershipDiscount = 0;
      {
        const customerEmail = email.toLowerCase().trim();
        const activeMembership = await tx.customerMembership.findFirst({
          where: { companyId: estimate.companyId, customerEmail, status: "ACTIVE" },
          include: { plan: true },
          orderBy: { createdAt: "desc" },
        });

        if (activeMembership) {
          const plan = activeMembership.plan;

          // O plano cobre este serviço? (serviceIdsJson nulo/vazio = cobre todos).
          // Usa o bookingConfigId — mesmo identificador do checkCustomerMembershipCoverage.
          let serviceCovered = true;
          if (plan.serviceIdsJson) {
            try {
              const ids: string[] = JSON.parse(plan.serviceIdsJson);
              if (ids.length > 0 && !ids.includes(estimate.bookingConfigId)) serviceCovered = false;
            } catch {
              /* JSON inválido → trata como cobre tudo */
            }
          }

          const isUnlimited = plan.includedSessionsCount === null;
          const discount = () =>
            roundMoney((Number(estimate.total) * Number(plan.discountPercent ?? 0)) / 100);

          if (serviceCovered && isUnlimited) {
            membershipCovered = true;
            await tx.membershipUsage.create({
              data: {
                customerMembershipId: activeMembership.id,
                bookingId: newBooking.id,
                serviceName: estimate.bookingConfig.name,
                notes: "Sessão coberta por plano ilimitado",
              },
            });
          } else if (serviceCovered) {
            // Débito condicional: só decrementa se ainda há saldo (evita corrida/double-spend)
            const dec = await tx.customerMembership.updateMany({
              where: { id: activeMembership.id, remainingSessions: { gt: 0 } },
              data: { remainingSessions: { decrement: 1 } },
            });
            if (dec.count === 1) {
              membershipCovered = true;
              await tx.membershipUsage.create({
                data: {
                  customerMembershipId: activeMembership.id,
                  bookingId: newBooking.id,
                  serviceName: estimate.bookingConfig.name,
                  notes: "1 crédito de pacote debitado",
                },
              });
            } else {
              // Sem saldo restante → não coberto, mas o plano pode dar desconto percentual
              membershipDiscount = discount();
            }
          } else {
            // Serviço fora do plano → aplica apenas o desconto de membro
            membershipDiscount = discount();
          }
        }
      }

      // ── Gift Card / Vale-Presente: débito atômico sobre o valor após desconto ──
      let giftCardDebit = 0;
      if (giftCardCode && !membershipCovered) {
        const amountBeforeGift = roundMoney(Math.max(0, Number(estimate.total) - membershipDiscount));
        if (amountBeforeGift > 0) {
          const card = await tx.giftCard.findFirst({
            where: {
              companyId: estimate.companyId,
              code: giftCardCode.toUpperCase(),
              status: "ACTIVE",
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          });

          if (card && Number(card.currentBalance) > 0) {
            const debit = roundMoney(Math.min(Number(card.currentBalance), amountBeforeGift));
            // Débito condicional (race-safe): só aplica se o saldo ainda cobre o valor
            const upd = await tx.giftCard.updateMany({
              where: { id: card.id, currentBalance: { gte: debit } },
              data: { currentBalance: { decrement: debit } },
            });

            if (upd.count === 1) {
              giftCardDebit = debit;
              const refreshed = await tx.giftCard.findUnique({
                where: { id: card.id },
                select: { currentBalance: true },
              });
              if (refreshed && Number(refreshed.currentBalance) <= 0) {
                await tx.giftCard.update({ where: { id: card.id }, data: { status: "EXHAUSTED" } });
              }
              await tx.giftCardRedemption.create({
                data: {
                  giftCardId: card.id,
                  bookingId: newBooking.id,
                  amount: debit,
                  notes: `Resgate aplicado no agendamento #${newBooking.id.slice(-6)}`,
                },
              });
            }
          }
        }
      }

      return { newBooking, membershipCovered, membershipDiscount, giftCardDebit };
    });
    const booking = newBooking;

    // Create recurring series (additional slots for WEEKLY/BIWEEKLY/MONTHLY)
    if (recurrenceGroupId && recurrenceFrequency) {
      const COUNTS: Record<string, number> = { WEEKLY: 11, BIWEEKLY: 11, MONTHLY: 5 };
      const DAYS: Record<string, number> = { WEEKLY: 7, BIWEEKLY: 14, MONTHLY: 30 };
      const count = COUNTS[recurrenceFrequency] ?? 0;
      const daysStep = DAYS[recurrenceFrequency] ?? 7;
      const [baseY, baseM, baseD] = scheduledDate.split("-").map(Number);
      const baseDate = new Date(Date.UTC(baseY, baseM - 1, baseD));

      for (let i = 1; i <= count; i++) {
        const nextDate = new Date(baseDate);
        nextDate.setUTCDate(baseDate.getUTCDate() + daysStep * i);
        const nextDateStr = nextDate.toISOString().split("T")[0];

        // Ocorrência só é criada se cair em slot válido da grade PARA O MESMO
        // profissional (respeita dias de funcionamento, exceções e ocupados) —
        // sem passar o profissional, a série cairia em horários já vendidos.
        const occurrenceOk = await isSlotAvailable(
          agendaId,
          nextDateStr,
          scheduledStartTime,
          scheduledEndTime,
          finalProfessionalId
        );
        if (!occurrenceOk) continue;

        try {
          const recBooking = await db.booking.create({
            data: {
              companyId: estimate.companyId,
              bookingConfigId: estimate.bookingConfigId,
              agendaId,
              // A série inteira fica com o mesmo profissional do 1º atendimento
              professionalId: finalProfessionalId,
              scheduledDate: nextDateStr,
              scheduledStartTime,
              scheduledEndTime,
              status: bookingStatus,
              paymentMethod,
              paymentStatus: "PENDING",
              companyPaymentMethodId: chosenMethod?.id ?? null,
              recurrenceGroupId,
              recurrenceFrequency,
            },
          });
          await db.bookingSlot.create({
            data: {
              bookingId: recBooking.id,
              agendaId,
              date: nextDateStr,
              startTime: scheduledStartTime,
              endTime: scheduledEndTime,
              professionalId: slotProfessionalKey(finalProfessionalId),
            },
          });
          // Copy customer detail and home access from primary booking
          await db.bookingCustomerDetail.create({
            data: {
              bookingId: recBooking.id,
              firstName,
              lastName,
              email,
              phone,
              sendReminders,
              address,
              aptNo,
              city,
              zip,
            },
          });
          await db.bookingHomeAccess.create({
            data: {
              bookingId: recBooking.id,
              accessType,
              keepKeyWithProvider,
              accessNote,
              additionalNote,
            },
          });
        } catch {
          // Slot taken for this date — skip
        }
      }
    }

    // Valor devido após cobertura de plano/pacote, desconto de membro e gift card;
    // e o quanto cobrar online agora (aplicando sinal, se exigido).
    const { amountDue, onlineCharge } = computeBookingCharge({
      total: Number(estimate.total),
      membershipCovered,
      membershipDiscount,
      giftCardDebit,
      requireDeposit: paymentSettings?.requireDeposit ?? false,
      depositPercentage: paymentSettings?.depositPercentage ?? 30,
    });

    // Totalmente coberto (plano/pacote ou gift card): nada a cobrar online —
    // confirma e marca como pago, independente do método escolhido.
    if (amountDue <= 0) {
      await db.booking.update({
        where: { id: booking.id },
        data: { status: "CONFIRMED", paymentStatus: "PAID" },
      });
      void enqueueNotification({ kind: "BOOKING_CONFIRMED", bookingId: booking.id });
      void enqueueNotification({ kind: "COMPANY_NEW_BOOKING", bookingId: booking.id });
      void triggerWebhooks(booking.companyId, "BOOKING_CONFIRMED", { bookingId: booking.id });
      void syncToGoogleCalendar(booking.id);
      return { success: true, bookingId: booking.id, paymentMethod: "CASH_CHECK" };
    }

    if (paymentMethod === "CASH_CHECK") {
      // CASH_CHECK bookings are immediately CONFIRMED — notify now.
      // O eventual abatimento (gift card) já está registrado; o cliente paga
      // o restante (amountDue) no local.
      void enqueueNotification({ kind: "BOOKING_CONFIRMED", bookingId: booking.id });
      void enqueueNotification({ kind: "COMPANY_NEW_BOOKING", bookingId: booking.id });
      void triggerWebhooks(booking.companyId, "BOOKING_CONFIRMED", { bookingId: booking.id });
      void syncToGoogleCalendar(booking.id);
      return { success: true, bookingId: booking.id, paymentMethod: "CASH_CHECK" };
    }

    if (paymentMethod === "PIX") {
      const pixResult = await createPixPayment(paymentSettings!.mercadoPagoAccessToken!, {
        bookingId: booking.id,
        amount: onlineCharge,
        description: `Agendamento #${booking.id.slice(-8)}`,
        payerEmail: email,
        payerName: `${firstName} ${lastName}`,
      });

      await db.booking.update({
        where: { id: booking.id },
        data: { mercadoPagoPaymentId: pixResult.id },
      });

      return {
        success: true,
        bookingId: booking.id,
        paymentMethod: "PIX",
        pixQrCode: pixResult.qrCode,
        pixQrCodeBase64: pixResult.qrCodeBase64,
      };
    }

    // Create Stripe PaymentIntent na moeda da empresa (multi-mercado)
    const amountCents = toStripeCents(onlineCharge);
    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: (estimate.company?.currency ?? "BRL").toLowerCase(),
      metadata: { bookingId: booking.id },
    });

    await db.booking.update({
      where: { id: booking.id },
      data: { stripePaymentIntentId: pi.id },
    });

    return {
      success: true,
      bookingId: booking.id,
      paymentMethod: "CARD",
      clientSecret: pi.client_secret!,
    };
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") {
      return {
        success: false,
        errors: { _: ["Este horário já foi reservado. Por favor, escolha outro horário."] },
      };
    }
    throw e;
  }
}

async function syncToGoogleCalendar(bookingId: string): Promise<void> {
  try {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        company: {
          include: {
            members: {
              where: { role: "OWNER", isActive: true },
              select: { userId: true },
            },
          },
        },
        bookingConfig: { select: { name: true } },
        customerDetail: { select: { address: true, city: true } },
      },
    });
    if (!booking) return;

    const ownerIds = booking.company.members.map((m) => m.userId);
    for (const userId of ownerIds) {
      const integration = await db.calendarIntegration.findUnique({
        where: { userId_provider: { userId, provider: "GOOGLE" } },
      });
      if (!integration?.isActive || !integration.accessToken) continue;

      // O guard acima garante accessToken não-nulo (o narrowing do TS não
      // propaga pela condição composta com optional chaining).
      await createCalendarEvent(integration.accessToken!, integration.refreshToken ?? null, {
        summary: `${booking.bookingConfig.name} — ${booking.company.name}`,
        description: `Agendamento #${bookingId}`,
        date: booking.scheduledDate,
        startTime: booking.scheduledStartTime,
        endTime: booking.scheduledEndTime,
        location: booking.customerDetail
          ? `${booking.customerDetail.address}, ${booking.customerDetail.city}`
          : undefined,
        calendarId: integration.calendarId ?? "primary",
      });
    }
  } catch (err) {
    console.error("[syncToGoogleCalendar]", err);
  }
}

export async function checkPixPaymentAction(bookingId: string): Promise<{ paid: boolean }> {
  // Action pública (checkout anônimo faz polling a cada 5s = 12/min) —
  // 30/min por IP cobre o uso legítimo e barra enumeração/abuso da API do MP
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await enforceRateLimit(RATE_LIMITS.PIX_CHECK, ip);
  if (!rl.allowed) return { paid: false };

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { paymentStatus: true, mercadoPagoPaymentId: true, companyId: true },
  });
  if (!booking) return { paid: false };
  if (booking.paymentStatus === "PAID") return { paid: true };

  // If still PENDING, verify directly with MP API
  if (booking.mercadoPagoPaymentId && booking.paymentStatus === "PENDING") {
    try {
      const { getPixPaymentStatus } = await import("@/lib/mercadopago");
      const settings = await db.companyPaymentSettings.findUnique({
        where: { companyId: booking.companyId },
      });
      if (settings?.mercadoPagoAccessToken) {
        const status = await getPixPaymentStatus(settings.mercadoPagoAccessToken, booking.mercadoPagoPaymentId);
        if (status === "approved") {
          await db.booking.update({
            where: { id: bookingId },
            data: { paymentStatus: "PAID", status: "CONFIRMED" },
          });
          void enqueueNotification({ kind: "BOOKING_CONFIRMED", bookingId: bookingId });
          void enqueueNotification({ kind: "COMPANY_NEW_BOOKING", bookingId: bookingId });
          return { paid: true };
        }
      }
    } catch (err) {
      console.error("[checkPixPayment] MP API check failed:", err);
    }
  }

  return { paid: false };
}

export async function cancelBookingAction(formData: FormData): Promise<CancelResult> {
  const bookingId = formData.get("bookingId") as string;
  const companySlug = formData.get("companySlug") as string;
  const reason = (formData.get("reason") as string) || null;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, errors: { _: ["Não autenticado"] } };

  const member = await db.companyUser.findFirst({
    where: {
      userId: session.user.id,
      company: { slug: companySlug },
      isActive: true,
    },
  });
  if (!member) return { success: false, errors: { _: ["Acesso negado"] } };

  const booking = await db.booking.findFirst({
    where: { id: bookingId, company: { slug: companySlug } },
    include: { company: true, estimate: true },
  });
  if (!booking) return { success: false, errors: { _: ["Agendamento não encontrado"] } };

  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    return { success: false, errors: { _: ["Este agendamento não pode ser cancelado"] } };
  }

  // Calcular antecedência do cancelamento vs política da empresa
  const comp = booking.company;
  const minNoticeHours = (comp as any).minCancellationNoticeHours ?? 24;
  const cancelFeeAmount = Number((comp as any).cancellationFee ?? 0);

  const [sYear, sMonth, sDay] = booking.scheduledDate.split("-").map(Number);
  const [sHour, sMin] = booking.scheduledStartTime.split(":").map(Number);
  const appointmentTime = new Date(sYear, sMonth - 1, sDay, sHour, sMin);
  const diffHours = (appointmentTime.getTime() - Date.now()) / (1000 * 60 * 60);

  const isLateCancellation = diffHours < minNoticeHours;

  await db.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledById: session.user.id,
        cancellationReason: reason,
      },
    });
    await tx.bookingSlot.deleteMany({ where: { bookingId } });
  });

  // Issue refund if paid by card
  if (booking.stripePaymentIntentId && booking.paymentStatus === "PAID") {
    const originalTotal = Number(booking.estimate?.total ?? 0);
    const { refundAmount, isFullRefund } = calculateCancellationRefund({
      total: originalTotal,
      cancellationFee: cancelFeeAmount,
      isLateCancellation,
    });

    if (isFullRefund) {
      await stripe.refunds.create({ payment_intent: booking.stripePaymentIntentId });
    } else if (refundAmount > 0) {
      await stripe.refunds.create({
        payment_intent: booking.stripePaymentIntentId,
        amount: toStripeCents(refundAmount),
      });
    }

    await db.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: "REFUNDED" },
    });
  }

  void enqueueNotification({ kind: "BOOKING_CANCELLED", bookingId: bookingId });
  void triggerWebhooks(booking.companyId, "BOOKING_CANCELLED", { bookingId });
  // Notify waitlist entries for this date
  void notifyWaitlistForDate(booking.agendaId, booking.scheduledDate, booking.companyId);
  return { success: true };
}

// ─── Refund ───────────────────────────────────────────────────────────────────

export async function refundBookingAction(
  bookingId: string,
  companySlug: string
): Promise<StatusResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const member = await db.companyUser.findFirst({
    where: { userId: session.user.id, company: { slug: companySlug }, isActive: true },
  });
  if (!member || (member.role !== "OWNER" && member.role !== "MANAGER")) {
    return { success: false, error: "Sem permissão" };
  }

  // Estorno é irreversível e sai dinheiro pelo gateway — limita rajada por
  // usuário mesmo com permissão válida.
  const rl = await enforceRateLimit(RATE_LIMITS.REFUND, session.user.id);
  if (!rl.allowed) {
    return { success: false, error: "Muitos estornos em sequência. Aguarde alguns minutos." };
  }

  const booking = await db.booking.findFirst({
    where: { id: bookingId, company: { slug: companySlug } },
  });
  if (!booking) return { success: false, error: "Agendamento não encontrado" };
  if (!booking.stripePaymentIntentId) return { success: false, error: "Pagamento não foi por cartão" };
  if (booking.paymentStatus !== "PAID") return { success: false, error: "Pagamento não confirmado" };
  if ((booking.paymentStatus as string) === "REFUNDED") return { success: false, error: "Já reembolsado" };

  const refund = await stripe.refunds.create({ payment_intent: booking.stripePaymentIntentId });

  await db.booking.update({
    where: { id: bookingId },
    data: {
      paymentStatus: "REFUNDED",
      refundAmount: refund.amount / 100,
      refundedAt: new Date(),
    },
  });

  return { success: true };
}

// ─── Confirmação manual de recebimento ────────────────────────────────────────
// Para métodos MANUAL (dinheiro, PIX por chave, Zelle, Venmo…) o gateway não
// confirma nada — o dono/gerente marca o recebimento aqui.

export async function markBookingPaidAction(
  bookingId: string,
  companySlug: string
): Promise<StatusResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const member = await db.companyUser.findFirst({
    where: { userId: session.user.id, company: { slug: companySlug }, isActive: true },
  });
  if (!member || (member.role !== "OWNER" && member.role !== "MANAGER")) {
    return { success: false, error: "Sem permissão" };
  }

  const booking = await db.booking.findFirst({
    where: { id: bookingId, company: { slug: companySlug } },
  });
  if (!booking) return { success: false, error: "Agendamento não encontrado" };
  if (booking.paymentStatus !== "PENDING") {
    return { success: false, error: "Pagamento não está aguardando confirmação" };
  }
  if (booking.status === "CANCELLED") {
    return { success: false, error: "Agendamento cancelado" };
  }

  const wasPending = booking.status === "PENDING";

  await db.booking.update({
    where: { id: bookingId },
    data: {
      paymentStatus: "PAID",
      paidAt: new Date(),
      paymentConfirmedById: session.user.id,
      // Booking aguardando pagamento passa a confirmado
      ...(wasPending ? { status: "CONFIRMED" } : {}),
    },
  });

  if (wasPending) {
    void enqueueNotification({ kind: "BOOKING_CONFIRMED", bookingId: bookingId });
    void triggerWebhooks(booking.companyId, "BOOKING_CONFIRMED", { bookingId });
  }

  return { success: true };
}

// ─── Reschedule ───────────────────────────────────────────────────────────────

export async function rescheduleBookingAction(
  bookingId: string,
  companySlug: string,
  newDate: string,
  newStartTime: string,
  newEndTime: string,
  isClientInitiated?: boolean
): Promise<StatusResult & { warning?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const member = await db.companyUser.findFirst({
    where: { userId: session.user.id, company: { slug: companySlug }, isActive: true },
  });
  if (!member) return { success: false, error: "Acesso negado" };
  if (member.role !== "OWNER" && member.role !== "MANAGER") {
    return { success: false, error: "Sem permissão para reagendar" };
  }

  const booking = await db.booking.findFirst({
    where: { id: bookingId, company: { slug: companySlug } },
    include: { company: true },
  });
  if (!booking) return { success: false, error: "Agendamento não encontrado" };
  if (booking.status !== "CONFIRMED" && booking.status !== "PENDING") {
    return { success: false, error: "Somente agendamentos confirmados podem ser reagendados" };
  }

  // Verificação dinâmica de antecedência mínima configurada na empresa
  const minNoticeHours = (booking.company as any).minCancellationNoticeHours ?? 24;
  const [sYear, sMonth, sDay] = booking.scheduledDate.split("-").map(Number);
  const [sHour, sMin] = booking.scheduledStartTime.split(":").map(Number);
  const appointmentTime = new Date(sYear, sMonth - 1, sDay, sHour, sMin);
  const diffHours = (appointmentTime.getTime() - Date.now()) / (1000 * 60 * 60);

  let warning: string | undefined = undefined;

  if (diffHours < minNoticeHours) {
    if (isClientInitiated) {
      return {
        success: false,
        error: `Reagendamentos online exigem pelo menos ${minNoticeHours}h de antecedência. Entre em contato diretamente com o estabelecimento.`,
      };
    } else {
      warning = `Aviso: Reagendamento realizado dentro da janela de antecedência mínima (${minNoticeHours}h).`;
    }
  }

  // Server-side slot validation (grade da agenda + exceções + ocupados) para o
  // profissional DESTE agendamento — validar contra "qualquer profissional"
  // deixaria reagendar por cima de um horário que ele já tem vendido.
  const slotOk = await isSlotAvailable(
    booking.agendaId,
    newDate,
    newStartTime,
    newEndTime,
    booking.professionalId
  );
  if (!slotOk) {
    return { success: false, error: "Horário indisponível. Escolha outro horário." };
  }

  try {
    await db.$transaction(async (tx) => {
      // Release old slot
      await tx.bookingSlot.deleteMany({ where: { bookingId } });
      // Create new slot (throws P2002 if taken)
      await tx.bookingSlot.create({
        data: {
          bookingId,
          agendaId: booking.agendaId,
          date: newDate,
          startTime: newStartTime,
          endTime: newEndTime,
          professionalId: slotProfessionalKey(booking.professionalId),
        },
      });
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          scheduledDate: newDate,
          scheduledStartTime: newStartTime,
          scheduledEndTime: newEndTime,
          rescheduledAt: new Date(),
          status: "CONFIRMED",
        },
      });
    });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") {
      return { success: false, error: "Horário já ocupado. Escolha outro horário." };
    }
    throw e;
  }

  return { success: true };
}

// ─── Status lifecycle ─────────────────────────────────────────────────────────

type StatusResult = { success: true } | { success: false; error: string };

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  CONFIRMED: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
};

export async function updateBookingStatusAction(
  bookingId: string,
  companySlug: string,
  newStatus: string
): Promise<StatusResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const member = await db.companyUser.findFirst({
    where: {
      userId: session.user.id,
      company: { slug: companySlug },
      isActive: true,
    },
  });
  if (!member) return { success: false, error: "Acesso negado" };

  const booking = await db.booking.findFirst({
    where: { id: bookingId, company: { slug: companySlug } },
  });
  if (!booking) return { success: false, error: "Agendamento não encontrado" };

  const allowed = ALLOWED_TRANSITIONS[booking.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return { success: false, error: "Transição de status não permitida" };
  }

  // Validação de integridade de data: Agendamentos futuros NÃO podem ser iniciados nem concluídos
  const todayStr = new Date().toISOString().split("T")[0];
  if ((newStatus === "IN_PROGRESS" || newStatus === "COMPLETED") && booking.scheduledDate > todayStr) {
    return {
      success: false,
      error: "Não é permitido iniciar ou concluir agendamentos com data futura.",
    };
  }

  await db.booking.update({
    where: { id: bookingId },
    data: { status: newStatus as "IN_PROGRESS" | "COMPLETED" },
  });

  void enqueueNotification({ kind: "STATUS_CHANGED", bookingId: bookingId, payload: { newStatus: newStatus } });
  if (newStatus === "COMPLETED") {
    void triggerWebhooks(booking.companyId, "BOOKING_COMPLETED", { bookingId });
  } else if (newStatus === "CONFIRMED") {
    void triggerWebhooks(booking.companyId, "BOOKING_CONFIRMED", { bookingId });
  }
  return { success: true };
}

export type ExtraItemInput = {
  description: string;
  amount: number;
  category?: "SURCHARGE" | "PRODUCT";
  parentServiceName?: string;
};

export type CompleteBookingAdjustmentsPayload = {
  bookingId: string;
  companySlug: string;
  additionalItems: ExtraItemInput[];
  discountType: "FIXED" | "PERCENTAGE";
  discountValue: number;
  discountReason?: string;
};

export async function completeBookingWithAdjustmentsAction(
  payload: CompleteBookingAdjustmentsPayload
): Promise<StatusResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const member = await db.companyUser.findFirst({
    where: {
      userId: session.user.id,
      company: { slug: payload.companySlug },
      isActive: true,
    },
  });
  if (!member) return { success: false, error: "Acesso negado" };

  const booking = await db.booking.findFirst({
    where: { id: payload.bookingId, company: { slug: payload.companySlug } },
    include: { estimate: true },
  });
  if (!booking) return { success: false, error: "Agendamento não encontrado" };

  // Validação de integridade de data: Agendamentos futuros NÃO podem ser concluídos
  const todayStr = new Date().toISOString().split("T")[0];
  if (booking.scheduledDate > todayStr) {
    return {
      success: false,
      error: "Não é permitido concluir agendamentos com data futura.",
    };
  }

  // Cálculo financeiro do fechamento
  const originalTotal = Number(booking.estimate?.total ?? 0);
  const additionalsTotal = payload.additionalItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const subtotal = originalTotal + additionalsTotal;

  let discountAmount = 0;
  if (payload.discountType === "PERCENTAGE") {
    discountAmount = (subtotal * (Number(payload.discountValue) || 0)) / 100;
  } else {
    discountAmount = Number(payload.discountValue) || 0;
  }

  const finalTotal = Math.max(0, subtotal - discountAmount);
  const diffAmount = finalTotal - originalTotal;

  // Se houver desconto que diminuiu o valor total pago antecipado pelo cliente por cartão no Stripe
  if (diffAmount < 0 && booking.stripePaymentIntentId && booking.paymentStatus === "PAID") {
    try {
      const refundCents = Math.round(Math.abs(diffAmount) * 100);
      if (refundCents > 0) {
        await stripe.refunds.create({
          payment_intent: booking.stripePaymentIntentId,
          amount: refundCents,
        });
      }
    } catch (e) {
      console.error("[Stripe Refund Error on Completion]:", e);
    }
  }

  const adjustmentsJson = JSON.stringify({
    additionalItems: payload.additionalItems,
    discount: discountAmount > 0 ? {
      type: payload.discountType,
      value: payload.discountValue,
      amount: discountAmount,
      reason: payload.discountReason || "Desconto no atendimento",
    } : null,
  });

  // Atualizar estimativa e booking para COMPLETED
  await db.$transaction(async (tx) => {
    if (booking.estimateId) {
      await tx.estimate.update({
        where: { id: booking.estimateId },
        data: {
          subtotal,
          total: finalTotal,
          notes: adjustmentsJson,
        },
      });
    }

    await tx.booking.update({
      where: { id: payload.bookingId },
      data: {
        status: "COMPLETED",
      },
    });
  });

  void enqueueNotification({ kind: "STATUS_CHANGED", bookingId: payload.bookingId, payload: { newStatus: "COMPLETED" } });
  void notifyBookingCompletedWithInvoice(
    payload.bookingId,
    originalTotal,
    payload.additionalItems,
    discountAmount,
    finalTotal
  );
  void triggerWebhooks(booking.companyId, "BOOKING_COMPLETED", { bookingId: payload.bookingId });

  return { success: true };
}

export type WalkInPayload = {
  companySlug: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceTypeId: string;
  professionalId?: string;
  status: "IN_PROGRESS" | "CONFIRMED";
  paymentMethod?: "CASH_CHECK" | "CARD" | "PIX";
};

export type WalkInResult =
  | { success: true; data: { bookingId: string } }
  | { success: false; errors: Record<string, string[]> };

export async function createWalkInBookingAction(
  payload: WalkInPayload
): Promise<WalkInResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, errors: { _: ["Não autenticado"] } };

  const company = await db.company.findUnique({
    where: { slug: payload.companySlug },
    include: {
      agendas: { where: { status: "ACTIVE" }, take: 1 },
      bookingConfigs: { where: { status: "PUBLISHED" }, take: 1 },
    },
  });
  if (!company) return { success: false, errors: { _: ["Empresa não encontrada"] } };

  const member = await db.companyUser.findFirst({
    where: { companyId: company.id, userId: session.user.id, isActive: true },
  });
  if (!member && session.user.role !== "admin") {
    return { success: false, errors: { _: ["Acesso negado"] } };
  }

  const serviceType = await db.serviceType.findUnique({
    where: { id: payload.serviceTypeId },
  });
  if (!serviceType) {
    return { success: false, errors: { _: ["Serviço selecionado não encontrado"] } };
  }

  // Get active agenda and config
  let agendaId: string | undefined = company.agendas[0]?.id;
  if (!agendaId) {
    const defaultAgenda = await db.agenda.findFirst({ where: { companyId: company.id } });
    agendaId = defaultAgenda?.id;
  }

  let bookingConfigId: string | undefined = company.bookingConfigs[0]?.id;
  if (!bookingConfigId) {
    const defaultConfig = await db.bookingConfig.findFirst({ where: { companyId: company.id } });
    bookingConfigId = defaultConfig?.id;
  }

  if (!agendaId || !bookingConfigId) {
    return { success: false, errors: { _: ["É necessário ter ao menos uma agenda e configuração de agendamento ativas"] } };
  }

  const now = new Date();
  const scheduledDate = now.toISOString().split("T")[0];
  const startHour = String(now.getHours()).padStart(2, "0");
  const startMin = String(now.getMinutes()).padStart(2, "0");
  const scheduledStartTime = `${startHour}:${startMin}`;

  const durationMin = serviceType.estimatedMinutes || 30;
  const endDateTime = new Date(now.getTime() + durationMin * 60000);
  const endHour = String(endDateTime.getHours()).padStart(2, "0");
  const endMin = String(endDateTime.getMinutes()).padStart(2, "0");
  const scheduledEndTime = `${endHour}:${endMin}`;

  const nameParts = payload.customerName.trim().split(" ");
  const firstName = nameParts[0] || "Cliente";
  const lastName = nameParts.slice(1).join(" ") || "Presencial";
  const email = payload.customerEmail?.trim() || `cliente.${Date.now()}@local.com`;
  const phone = payload.customerPhone?.trim() || "00000000000";

  const result = await db.$transaction(async (tx) => {
    // 1. Criar Orçamento convertido
    const estimate = await tx.estimate.create({
      data: {
        companyId: company.id,
        bookingConfigId,
        customerName: payload.customerName.trim(),
        customerEmail: email,
        status: "CONVERTED",
        subtotal: serviceType.price,
        total: serviceType.price,
        serviceTypes: {
          create: {
            serviceTypeId: serviceType.id,
            quantity: 1,
            unitPrice: serviceType.price,
            subtotal: serviceType.price,
          },
        },
      },
    });

    // 2. Criar Booking
    const booking = await tx.booking.create({
      data: {
        companyId: company.id,
        bookingConfigId,
        agendaId,
        estimateId: estimate.id,
        scheduledDate,
        scheduledStartTime,
        scheduledEndTime,
        professionalId: payload.professionalId || null,
        status: payload.status || "IN_PROGRESS",
        paymentMethod: payload.paymentMethod || "CASH_CHECK",
        paymentStatus: "PENDING",
      },
    });

    // 3. Customer detail
    await tx.bookingCustomerDetail.create({
      data: {
        bookingId: booking.id,
        firstName,
        lastName,
        email,
        phone,
        address: "Presencial / Walk-In",
        city: "Local",
        zip: "00000-000",
      },
    });

    // 4. Upsert Customer entity
    try {
      const customer = await tx.customer.upsert({
        where: {
          companyId_email: {
            companyId: company.id,
            email: email.toLowerCase().trim(),
          },
        },
        update: {
          firstName,
          lastName,
          phone,
          totalBookings: { increment: 1 },
          lastBookingDate: scheduledDate,
        },
        create: {
          companyId: company.id,
          email: email.toLowerCase().trim(),
          firstName,
          lastName,
          phone,
          totalBookings: 1,
          lastBookingDate: scheduledDate,
        },
      });

      await tx.booking.update({
        where: { id: booking.id },
        data: { customerId: customer.id },
      });
    } catch {}

    return booking;
  });

  revalidatePath(`/${payload.companySlug}/agendamentos`);
  revalidatePath(`/${payload.companySlug}/dashboard`);
  revalidatePath(`/${payload.companySlug}/comissoes`);

  return { success: true, data: { bookingId: result.id } };
}

/**
 * Registrar Faltou (No-Show com ou sem aviso prévio)
 */
export async function markBookingNoShowAction(payload: {
  bookingId: string;
  companySlug: string;
  didNotify: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const booking = await db.booking.findFirst({
    where: { id: payload.bookingId, company: { slug: payload.companySlug } },
    include: { company: true },
  });

  if (!booking) return { success: false, error: "Agendamento não encontrado" };

  const newStatus = payload.didNotify ? "CANCELLED" : "NO_SHOW";
  const reason = payload.didNotify
    ? "Cliente avisou previamente que não poderia comparecer"
    : "Cliente faltou sem aviso prévio (No-Show registrado)";

  await db.booking.update({
    where: { id: payload.bookingId },
    data: {
      status: newStatus as any,
      cancelledAt: new Date(),
      cancelledById: session.user.id,
      cancellationReason: reason,
    },
  });

  revalidatePath(`/${payload.companySlug}/agendamentos`);
  return { success: true };
}
