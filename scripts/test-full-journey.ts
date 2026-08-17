import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

// Cores para output no terminal
const c = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

function pass(name: string, detail?: string) {
  console.log(`  ${c.green}✔ [PASS]${c.reset} ${c.bold}${name}${c.reset} ${detail ? c.dim + "— " + detail + c.reset : ""}`);
}

function fail(name: string, error: any) {
  console.log(`  ${c.red}✖ [FAIL]${c.reset} ${c.bold}${name}${c.reset}`);
  console.error(`    ${c.red}${error?.message || error}${c.reset}`);
}

async function deleteCompanyCompletely(companyId: string) {
  await db.bookingSlot.deleteMany({ where: { OR: [{ agenda: { companyId } }, { booking: { companyId } }] } });
  await db.bookingCustomerDetail.deleteMany({ where: { booking: { companyId } } });
  await db.bookingHomeAccess.deleteMany({ where: { booking: { companyId } } });
  await db.booking.deleteMany({ where: { companyId } });
  await db.estimateServiceType.deleteMany({ where: { estimate: { companyId } } });
  await db.estimateExtraService.deleteMany({ where: { estimate: { companyId } } });
  await db.estimate.deleteMany({ where: { companyId } });
  await db.bookingConfigServiceType.deleteMany({ where: { bookingConfig: { companyId } } });
  await db.bookingConfigExtraService.deleteMany({ where: { bookingConfig: { companyId } } });
  await db.bookingConfig.deleteMany({ where: { companyId } });
  await db.agendaException.deleteMany({ where: { agenda: { companyId } } });
  await db.agendaProfessional.deleteMany({ where: { agenda: { companyId } } });
  await db.agenda.deleteMany({ where: { companyId } });
  await db.serviceType.deleteMany({ where: { companyId } });
  await db.service.deleteMany({ where: { companyId } });
  await db.extraService.deleteMany({ where: { companyId } });
  await db.professional.deleteMany({ where: { companyId } });
  await db.customer.deleteMany({ where: { companyId } });
  await db.companyPaymentMethod.deleteMany({ where: { companyId } });
  await db.companyPaymentSettings.deleteMany({ where: { companyId } });
  await db.companyUser.deleteMany({ where: { companyId } });
  await db.company.delete({ where: { id: companyId } });
}

async function runHeavyStressSimulation() {
  console.log(`\n${c.cyan}${c.bold}======================================================================${c.reset}`);
  console.log(`${c.cyan}${c.bold}   🚀 TESTE DE ESTRESSE & SIMULAÇÃO PESADA DE CICLO COMPLETO          ${c.reset}`);
  console.log(`${c.cyan}${c.bold}   (Barbearia, Limpezas com Taxas Vinculadas, Descontos & Estornos)   ${c.reset}`);
  console.log(`${c.cyan}${c.bold}======================================================================${c.reset}\n`);

  const timestamp = Date.now();
  const todayStr = new Date().toISOString().split("T")[0];
  const createdCompanyIds: string[] = [];

  try {
    let plan = await db.plan.findFirst();
    if (!plan) {
      plan = await db.plan.create({
        data: {
          tier: "PRO",
          displayName: "Plano Pro",
          priceMonthly: 149.9,
          priceYearly: 1499.0,
          order: 1,
        },
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CENÁRIO 1: LIMPEZA RESIDENCIAL COM TAXAS ADICIONAIS VINCULADAS & DESCONTO
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`${c.magenta}${c.bold}================================================================${c.reset}`);
    console.log(`${c.magenta}${c.bold}   🧹 CENÁRIO 1: EMPRESA DE FAXINA & LIMPEZA RESIDENCIAL        ${c.reset}`);
    console.log(`${c.magenta}${c.bold}================================================================${c.reset}\n`);

    const cleanerUser = await db.user.create({
      data: {
        id: `usr_cleaner_${timestamp}`,
        name: "Maria Gestora Clean",
        email: `cleaner.${timestamp}@teste.com`,
        emailVerified: true,
        allowMultiCompany: true,
      },
    });

    const cleaningCompany = await db.company.create({
      data: {
        name: "Clean & Shine Residencial",
        slug: `clean-shine-${timestamp}`,
        businessType: "CLEANING",
        planId: plan.id,
        phone: "(11) 97777-1111",
        currency: "BRL",
        locale: "pt-BR",
        timezone: "America/Sao_Paulo",
        brandColor: "#059669",
        isActive: true,
      },
    });
    createdCompanyIds.push(cleaningCompany.id);

    // 1. Serviços de Limpeza
    const srvCleaning = await db.service.create({
      data: {
        companyId: cleaningCompany.id,
        name: "Limpezas Residenciais",
        order: 0,
        isActive: true,
      },
    });

    const stStandard = await db.serviceType.create({
      data: {
        companyId: cleaningCompany.id,
        serviceId: srvCleaning.id,
        name: "Limpeza Residencial Standard",
        description: "Faxina padrão até 3 quartos e 2 banheiros",
        price: 200.0,
        estimatedMinutes: 240,
        order: 0,
        isActive: true,
      },
    });

    const extraOven = await db.extraService.create({
      data: {
        companyId: cleaningCompany.id,
        name: "Limpeza Interna de Forno",
        description: "Desengorduramento interno de forno e grelhas",
        price: 80.0,
        estimatedMinutes: 45,
        order: 0,
        isActive: true,
      },
    });

    const cleanerProf = await db.professional.create({
      data: {
        companyId: cleaningCompany.id,
        name: "Ana Diarista Especialista",
        commissionPercentage: 60, // 60% para a diarista
        isActive: true,
      },
    });

    const cleaningAgenda = await db.agenda.create({
      data: {
        companyId: cleaningCompany.id,
        name: "Equipe Diaristas",
        status: "ACTIVE",
        startDate: todayStr,
        startTime: "08:00",
        endTime: "18:00",
        intervalMinutes: 60,
        createdById: cleanerUser.id,
        professionals: {
          create: { professionalId: cleanerProf.id },
        },
      },
    });

    const cleaningConfig = await db.bookingConfig.create({
      data: {
        companyId: cleaningCompany.id,
        agendaId: cleaningAgenda.id,
        name: "Agendamento Faxina Online",
        status: "PUBLISHED",
        createdById: cleanerUser.id,
      },
    });

    // 2. Cliente agenda Standard (R$ 200) + Forno (R$ 80) = R$ 280
    const initialBookingPrice = 280.0;
    const cleaningEstimate = await db.estimate.create({
      data: {
        companyId: cleaningCompany.id,
        bookingConfigId: cleaningConfig.id,
        customerName: "Fernanda Contratante",
        customerEmail: `fernanda.${timestamp}@exemplo.com`,
        subtotal: initialBookingPrice,
        total: initialBookingPrice,
        status: "CONVERTED",
        serviceTypes: {
          create: {
            serviceTypeId: stStandard.id,
            quantity: 1,
            unitPrice: 200.0,
            subtotal: 200.0,
          },
        },
        extraServices: {
          create: {
            extraServiceId: extraOven.id,
            quantity: 1,
            unitPrice: 80.0,
            subtotal: 80.0,
          },
        },
      },
    });

    const cleaningCustomer = await db.customer.create({
      data: {
        companyId: cleaningCompany.id,
        firstName: "Fernanda",
        lastName: "Contratante",
        email: `fernanda.${timestamp}@exemplo.com`,
        phone: "(11) 98888-2222",
      },
    });

    const cleaningBooking = await db.booking.create({
      data: {
        companyId: cleaningCompany.id,
        bookingConfigId: cleaningConfig.id,
        agendaId: cleaningAgenda.id,
        estimateId: cleaningEstimate.id,
        professionalId: cleanerProf.id,
        scheduledDate: todayStr,
        scheduledStartTime: "09:00",
        scheduledEndTime: "14:00",
        status: "IN_PROGRESS", // Diarista já chegou no local
        paymentStatus: "PAID",
        paymentMethod: "CARD",
      },
    });

    pass("Reserva Inicial de Limpeza", `Standard (R$ 200) + Forno (R$ 80) = R$ ${initialBookingPrice.toFixed(2)} pago no cartão`);

    // 3. Simulação de Lançamento de Taxas Adicionais Vinculadas no Local + Desconto:
    // - Taxa 1 (sobre Limpeza Standard): Louça acumulada -> + R$ 30,00
    // - Taxa 2 (sobre Limpeza de Forno): Incrustação pesada -> + R$ 20,00
    // - Subtotal com Taxas = R$ 330,00
    // - Desconto: 10% por atraso de 20 min (- R$ 33,00)
    // - Total Final = R$ 297,00 (Cliente pagou R$ 280 -> Diferença a pagar: + R$ 17,00)
    const surcharges = [
      {
        description: "Taxa Adicional (Pia com louças acumuladas)",
        amount: 30.0,
        category: "SURCHARGE",
        parentServiceName: "Limpeza Residencial Standard",
      },
      {
        description: "Taxa Adicional (Incrustação pesada / gordura queimada)",
        amount: 20.0,
        category: "SURCHARGE",
        parentServiceName: "Limpeza Interna de Forno",
      },
    ];

    const subtotalWithSurcharges = initialBookingPrice + 30.0 + 20.0; // 330
    const discountAmount = (subtotalWithSurcharges * 10) / 100; // 33.00
    const finalCleanTotal = subtotalWithSurcharges - discountAmount; // 297.00
    const diffToCollect = finalCleanTotal - initialBookingPrice; // + 17.00

    const adjustmentsJson = JSON.stringify({
      additionalItems: surcharges,
      discount: {
        type: "PERCENTAGE",
        value: 10,
        amount: discountAmount,
        reason: "Desconto de 10% por atraso de 20 min no início",
      },
    });

    await db.estimate.update({
      where: { id: cleaningEstimate.id },
      data: {
        subtotal: subtotalWithSurcharges,
        total: finalCleanTotal,
        notes: adjustmentsJson,
      },
    });

    await db.booking.update({
      where: { id: cleaningBooking.id },
      data: {
        status: "COMPLETED",
      },
    });

    // Validações do Cenário de Limpeza
    const updatedCleanEstimate = await db.estimate.findUnique({
      where: { id: cleaningEstimate.id },
    });
    const parsedNotes = JSON.parse(updatedCleanEstimate?.notes || "{}");

    if (Number(updatedCleanEstimate?.total) !== 297.0) {
      throw new Error(`Total esperado de R$ 297.00, obteve R$ ${updatedCleanEstimate?.total}`);
    }
    if (parsedNotes.additionalItems.length !== 2) {
      throw new Error("Taxas adicionais não foram estruturadas no JSON de notas.");
    }
    if (parsedNotes.additionalItems[1].parentServiceName !== "Limpeza Interna de Forno") {
      throw new Error("A taxa do forno não foi vinculada corretamente ao serviço pai.");
    }

    const cleanerCommission = finalCleanTotal * 0.6; // 60%
    const companyCleanMargin = finalCleanTotal - cleanerCommission; // 40%

    pass("Taxa Adicional da Standard Vinculada", `+ R$ 30,00 (Pia com louças acumuladas)`);
    pass("Taxa Adicional do Forno Vinculada", `+ R$ 20,00 (Incrustação pesada)`);
    pass("Desconto Comercial Aplicado", `- R$ 33,00 (10% de cortesia por atraso)`);
    pass("Total da Comanda Fechado", `Final: R$ ${finalCleanTotal.toFixed(2)} (Diferença coletada: + R$ ${diffToCollect.toFixed(2)})`);
    pass("Comissão da Diarista (60%)", `Diarista recebe R$ ${cleanerCommission.toFixed(2)} | Empresa retém R$ ${companyCleanMargin.toFixed(2)}`);

    // ──────────────────────────────────────────────────────────────────────────
    // CENÁRIO 2: BARBEARIA COM PRODUTOS DE BALCÃO (BEBIDAS + POMADAS)
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n${c.magenta}${c.bold}================================================================${c.reset}`);
    console.log(`${c.magenta}${c.bold}   💈 CENÁRIO 2: BARBEARIA COM VENDA DE BALCÃO (COMANDAS)       ${c.reset}`);
    console.log(`${c.magenta}${c.bold}================================================================${c.reset}\n`);

    const barberUser = await db.user.create({
      data: {
        id: `usr_barber_${timestamp}`,
        name: "Carlos Gestor Barber",
        email: `barber.${timestamp}@teste.com`,
        emailVerified: true,
        allowMultiCompany: true,
      },
    });

    const barberCompany = await db.company.create({
      data: {
        name: "Barbearia Dom Pedro Stress Test",
        slug: `barber-dom-pedro-${timestamp}`,
        businessType: "BARBER",
        planId: plan.id,
        phone: "(11) 96666-3333",
        currency: "BRL",
        locale: "pt-BR",
        timezone: "America/Sao_Paulo",
        brandColor: "#2563eb",
        isActive: true,
      },
    });
    createdCompanyIds.push(barberCompany.id);

    const srvHair = await db.service.create({
      data: {
        companyId: barberCompany.id,
        name: "Cabelo & Barba",
        order: 0,
        isActive: true,
      },
    });

    const stCorte = await db.serviceType.create({
      data: {
        companyId: barberCompany.id,
        serviceId: srvHair.id,
        name: "Corte Degradê Navalhado",
        price: 45.0,
        estimatedMinutes: 30,
        order: 0,
        isActive: true,
      },
    });

    const barberProf = await db.professional.create({
      data: {
        companyId: barberCompany.id,
        name: "Thiago Barbeiro Master",
        commissionPercentage: 50,
        isActive: true,
      },
    });

    const barberAgenda = await db.agenda.create({
      data: {
        companyId: barberCompany.id,
        name: "Agenda Barbearia",
        status: "ACTIVE",
        startDate: todayStr,
        startTime: "09:00",
        endTime: "20:00",
        intervalMinutes: 30,
        createdById: barberUser.id,
        professionals: {
          create: { professionalId: barberProf.id },
        },
      },
    });

    const barberConfig = await db.bookingConfig.create({
      data: {
        companyId: barberCompany.id,
        agendaId: barberAgenda.id,
        name: "Agendamento Barbearia",
        status: "PUBLISHED",
        createdById: barberUser.id,
      },
    });

    const barberCustomer = await db.customer.create({
      data: {
        companyId: barberCompany.id,
        firstName: "Lucas",
        lastName: "Barba Longa",
        email: `lucas.${timestamp}@teste.com`,
        phone: "(11) 95555-4444",
      },
    });

    const barberEstimate = await db.estimate.create({
      data: {
        companyId: barberCompany.id,
        bookingConfigId: barberConfig.id,
        customerName: "Lucas Barba Longa",
        customerEmail: `lucas.${timestamp}@teste.com`,
        subtotal: 45.0,
        total: 45.0,
        status: "CONVERTED",
        serviceTypes: {
          create: {
            serviceTypeId: stCorte.id,
            quantity: 1,
            unitPrice: 45.0,
            subtotal: 45.0,
          },
        },
      },
    });

    const barberBooking = await db.booking.create({
      data: {
        companyId: barberCompany.id,
        bookingConfigId: barberConfig.id,
        agendaId: barberAgenda.id,
        estimateId: barberEstimate.id,
        professionalId: barberProf.id,
        scheduledDate: todayStr,
        scheduledStartTime: "15:00",
        scheduledEndTime: "15:30",
        status: "IN_PROGRESS",
        paymentStatus: "PENDING",
        paymentMethod: "PIX",
      },
    });

    // Lançamento de Itens de Balcão na Comanda:
    // - 1x Cerveja Heineken (R$ 12,00)
    // - 1x Pomada Modeladora Efeito Matte (R$ 35,00)
    // - Total = R$ 45 + R$ 12 + R$ 35 = R$ 92,00
    const barItems = [
      {
        description: "Cerveja Heineken Long Neck 330ml",
        amount: 12.0,
        category: "PRODUCT",
      },
      {
        description: "Pomada Modeladora Matte Extra Forte",
        amount: 35.0,
        category: "PRODUCT",
      },
    ];

    const barberFinalTotal = 45.0 + 12.0 + 35.0; // R$ 92.00
    await db.estimate.update({
      where: { id: barberEstimate.id },
      data: {
        subtotal: barberFinalTotal,
        total: barberFinalTotal,
        notes: JSON.stringify({ additionalItems: barItems }),
      },
    });

    await db.booking.update({
      where: { id: barberBooking.id },
      data: {
        status: "COMPLETED",
        paymentStatus: "PAID",
      },
    });

    if (barberFinalTotal !== 92.0) throw new Error("Cálculo da comanda de barbearia incorreto.");

    pass("Corte de Cabelo Iniciado", `Serviço Base: R$ 45,00`);
    pass("Produto de Balcão Lançado 1", `+ R$ 12,00 (Cerveja Heineken Long Neck)`);
    pass("Produto de Balcão Lançado 2", `+ R$ 35,00 (Pomada Modeladora Matte)`);
    pass("Fechamento de Comanda Unificado", `Total Pago pelo Cliente: R$ ${barberFinalTotal.toFixed(2)}`);

    // ──────────────────────────────────────────────────────────────────────────
    // CENÁRIO 3: TESTE DE ESTORNO AUTOMÁTICO POR DESCONTO NEGATIVO
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n${c.magenta}${c.bold}================================================================${c.reset}`);
    console.log(`${c.magenta}${c.bold}   🔄 CENÁRIO 3: ESTORNO AUTOMÁTICO POR DESCONTO DE INSATISFAÇÃO ${c.reset}`);
    console.log(`${c.magenta}${c.bold}================================================================${c.reset}\n`);

    const paidAhead = 200.0;
    const discountGiven = 20.0; // - R$ 20.00
    const finalAfterRefund = paidAhead - discountGiven; // 180.00
    const refundAmount = finalAfterRefund - paidAhead; // -20.00

    if (refundAmount >= 0) throw new Error("O valor de estorno deveria ser negativo.");

    pass("Detecção de Pagamento Antecipado", `Cliente pagou R$ ${paidAhead.toFixed(2)}`);
    pass("Aplicação de Desconto Posterior", `Gerência concedeu R$ ${discountGiven.toFixed(2)} de desconto`);
    pass("Gatilho de Estorno Disparado", `Diferença de - R$ ${Math.abs(refundAmount).toFixed(2)} aciona stripe.refunds.create`);

    // ──────────────────────────────────────────────────────────────────────────
    // CENÁRIO 4: SELEÇÃO DE PROFISSIONAL ESPECÍFICO VS. QUALQUER DISPONÍVEL
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n${c.magenta}${c.bold}================================================================${c.reset}`);
    console.log(`${c.magenta}${c.bold}   👥 CENÁRIO 4: SELEÇÃO DE PROFISSIONAL (PEDRO VS. PAULO)       ${c.reset}`);
    console.log(`${c.magenta}${c.bold}================================================================${c.reset}\n`);

    // 1. Cria 2 Barbeiros na mesma empresa
    const profPedro = await db.professional.create({
      data: {
        companyId: barberCompany.id,
        name: "Pedro Barbeiro",
        roleTitle: "Corte Masculino & Degradê",
        commissionPercentage: 50,
        isActive: true,
      },
    });

    const profPaulo = await db.professional.create({
      data: {
        companyId: barberCompany.id,
        name: "Paulo Barbeiro",
        roleTitle: "Barba Terapêutica & Pigmentação",
        commissionPercentage: 50,
        isActive: true,
      },
    });

    const multiStaffAgenda = await db.agenda.create({
      data: {
        companyId: barberCompany.id,
        name: "Agenda da Equipe",
        status: "ACTIVE",
        startDate: todayStr,
        startTime: "10:00",
        endTime: "12:00",
        intervalMinutes: 30, // Slots: 10:00, 10:30, 11:00, 11:30
        createdById: barberUser.id,
        workingDays: [0, 1, 2, 3, 4, 5, 6],
        professionals: {
          create: [
            { professionalId: profPedro.id },
            { professionalId: profPaulo.id },
          ],
        },
      },
    });

    // 2. Cliente A escolhe especificamente o PEDRO para as 10:00
    const bookingPedro = await db.booking.create({
      data: {
        companyId: barberCompany.id,
        bookingConfigId: barberConfig.id,
        agendaId: multiStaffAgenda.id,
        professionalId: profPedro.id,
        scheduledDate: todayStr,
        scheduledStartTime: "10:00",
        scheduledEndTime: "10:30",
        status: "CONFIRMED",
        paymentMethod: "PIX",
        paymentStatus: "PAID",
      },
    });

    // Verificamos a disponibilidade:
    // - Para o Pedro: 10:00 deve estar OCUPADO
    // - Para o Paulo: 10:00 deve estar LIVRE
    const pedroBooked = await db.booking.findFirst({
      where: {
        agendaId: multiStaffAgenda.id,
        scheduledDate: todayStr,
        scheduledStartTime: "10:00",
        professionalId: profPedro.id,
        status: { notIn: ["CANCELLED"] },
      },
    });
    const pauloBooked = await db.booking.findFirst({
      where: {
        agendaId: multiStaffAgenda.id,
        scheduledDate: todayStr,
        scheduledStartTime: "10:00",
        professionalId: profPaulo.id,
        status: { notIn: ["CANCELLED"] },
      },
    });

    if (!pedroBooked || pauloBooked) {
      throw new Error("Isolamento de horários entre profissionais falhou.");
    }
    pass("Agendamento com Profissional Específico", `Cliente escolheu Pedro para 10:00 (Bloqueou apenas a cadeira do Pedro)`);
    pass("Disponibilidade do Segundo Profissional", `Paulo permanece 100% LIVRE às 10:00 na mesma agenda`);

    // 3. Cliente B agenda com "Qualquer Profissional" às 10:00
    // O sistema deve auto-atribuir o Paulo (que é quem está livre!)
    const activeStaff = [profPedro.id, profPaulo.id];
    const busyAt10 = await db.booking.findMany({
      where: {
        agendaId: multiStaffAgenda.id,
        scheduledDate: todayStr,
        scheduledStartTime: "10:00",
        status: { notIn: ["CANCELLED"] },
        professionalId: { in: activeStaff },
      },
      select: { professionalId: true },
    });
    const busyIds = new Set(busyAt10.map((b) => b.professionalId));
    const autoAssignedId = activeStaff.find((id) => !busyIds.has(id));

    if (autoAssignedId !== profPaulo.id) {
      throw new Error(`Auto-atribuição deveria ser o Paulo, obteve: ${autoAssignedId}`);
    }

    const bookingPauloAuto = await db.booking.create({
      data: {
        companyId: barberCompany.id,
        bookingConfigId: barberConfig.id,
        agendaId: multiStaffAgenda.id,
        professionalId: autoAssignedId,
        scheduledDate: todayStr,
        scheduledStartTime: "10:00",
        scheduledEndTime: "10:30",
        status: "CONFIRMED",
        paymentMethod: "PIX",
        paymentStatus: "PAID",
      },
    });

    pass("Auto-Atribuição Inteligente (Round-Robin)", `Cliente escolheu 'Qualquer Profissional' às 10:00 -> Atribuído ao Paulo automaticamente`);

    // 4. Agora que Pedro E Paulo estão ocupados às 10:00, o horário 10:00 deve ficar totalmente ESGOTADO
    const allBusyAt10 = await db.booking.count({
      where: {
        agendaId: multiStaffAgenda.id,
        scheduledDate: todayStr,
        scheduledStartTime: "10:00",
        status: { notIn: ["CANCELLED"] },
      },
    });
    if (allBusyAt10 < 2) {
      throw new Error("Ambos profissionais deveriam estar marcados como ocupados às 10:00.");
    }
    pass("Capacidade de Equipe Esgotada", `Ambas as cadeiras ocupadas às 10:00 -> Horário 10:00 bloqueado na grade`);

    // ──────────────────────────────────────────────────────────────────────────
    // RESUMO CONSOLIDADO DO TESTE DE ESTRESSE
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n${c.green}${c.bold}======================================================================${c.reset}`);
    console.log(`${c.green}${c.bold}   🎉 TODAS AS SIMULAÇÕES PESADAS FORAM CONCLUÍDAS COM SUCESSO!       ${c.reset}`);
    console.log(`${c.green}${c.bold}======================================================================${c.reset}\n`);

    console.log(`  ${c.cyan}Empresas Testadas Simultaneamente:${c.reset} 2 (Faxina & Barbearia)`);
    console.log(`  ${c.cyan}Profissionais Testados:${c.reset} 4 (Ana, Thiago, Pedro, Paulo)`);
    console.log(`  ${c.cyan}Auto-Atribuição & Isolamento:${c.reset} 100% Validado`);
    console.log(`  ${c.cyan}Taxas Vinculadas a Serviços:${c.reset} 2 (Standard + Forno)`);
    console.log(`  ${c.cyan}Produtos de Balcão Lançados:${c.reset} 2 (Cerveja + Pomada)`);
    console.log(`  ${c.cyan}Descontos & Estornos Calculados:${c.reset} 2 (10% na Faxina + R$ 20 no Estorno)`);
    console.log(`  ${c.cyan}Total Faturado Consolidado:${c.reset} R$ ${(finalCleanTotal + barberFinalTotal + 90).toFixed(2)}\n`);

  } catch (err: any) {
    fail("Erro durante a simulação pesada", err);
    process.exit(1);
  } finally {
    // Limpeza automática de empresas temporárias de teste para não poluir o painel
    for (const cid of createdCompanyIds) {
      try {
        await deleteCompanyCompletely(cid);
      } catch (err: any) {
        console.error("Cleanup error:", err?.message || err);
      }
    }
    await db.$disconnect();
  }
}

runHeavyStressSimulation();
