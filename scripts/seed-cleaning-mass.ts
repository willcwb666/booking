import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { randomUUID } from "crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

// Cores ANSI
const c = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
};

// 20 Serviços de Limpeza
const SERVICES_DATA = [
  { name: "Limpeza Residencial Standard", desc: "Faxina padrão para manutenção da casa", price: 180.0, min: 180 },
  { name: "Limpeza Residencial Profunda / Pesada", desc: "Higienização completa detalhada", price: 320.0, min: 300 },
  { name: "Limpeza Pós-Obra Residencial", desc: "Remoção de entulhos finos, tintas e poeira", price: 480.0, min: 360 },
  { name: "Limpeza Pré-Mudança / Entrada", desc: "Higienização completa para novo morador", price: 350.0, min: 240 },
  { name: "Limpeza Pós-Mudança / Saída", desc: "Limpeza geral para entrega de imóvel", price: 350.0, min: 240 },
  { name: "Limpeza de Escritório Comercial", desc: "Limpeza de salas comerciais e recepções", price: 220.0, min: 180 },
  { name: "Limpeza Corporativa Andar Inteiro", desc: "Limpeza pesada de lajes corporativas", price: 650.0, min: 420 },
  { name: "Limpeza de Consultório / Clínica", desc: "Desinfecção hospitalar e sanitização", price: 280.0, min: 180 },
  { name: "Limpeza de Vidros e Fachadas Internas", desc: "Limpeza técnica de vidraças e esquadrias", price: 160.0, min: 120 },
  { name: "Limpeza de Carpetes e Tapetes", desc: "Extração por sucção e higienização a seco", price: 190.0, min: 150 },
  { name: "Higienização de Sofás e Estofados", desc: "Lavagem a seco e impermeabilização", price: 230.0, min: 120 },
  { name: "Limpeza de Cozinha Industrial", desc: "Desengorduramento pesado e coifas", price: 450.0, min: 300 },
  { name: "Limpeza Residencial Express", desc: "Limpeza rápida de áreas essenciais", price: 130.0, min: 90 },
  { name: "Limpeza de Varandas e Áreas Externas", desc: "Lavagem com lavadora de alta pressão", price: 150.0, min: 120 },
  { name: "Limpeza e Organização de Closets", desc: "Dobra de roupas e descarte consciente", price: 170.0, min: 180 },
  { name: "Sanitização e Desinfecção de Ambientes", desc: "Nebulização contra vírus e bactérias", price: 260.0, min: 120 },
  { name: "Limpeza de Studio / Loft", desc: "Ideal para apartamentos compactos até 45m²", price: 140.0, min: 120 },
  { name: "Limpeza Pós-Festa / Eventos", desc: "Recuperação rápida do espaço após eventos", price: 380.0, min: 240 },
  { name: "Limpeza de Garagens e Galpões", desc: "Remoção de óleo e lavagem de piso bruto", price: 290.0, min: 180 },
  { name: "Limpeza Mensal de Manutenção", desc: "Plano recorrente para casas e sobrados", price: 170.0, min: 180 },
];

// 20 Serviços Extras
const EXTRA_SERVICES_DATA = [
  { name: "Limpeza Interna de Geladeira e Freezer", price: 45.0, min: 40 },
  { name: "Limpeza Interna de Forno e Grelhas", price: 55.0, min: 45 },
  { name: "Limpeza Interna de Micro-ondas", price: 25.0, min: 20 },
  { name: "Lavagem e Passadoria de Roupas (Cesto)", price: 60.0, min: 60 },
  { name: "Limpeza de Janelas e Persianas", price: 40.0, min: 30 },
  { name: "Limpeza de Exaustor e Coifa", price: 50.0, min: 40 },
  { name: "Descarte de Lixo Acumulado e Reciclagem", price: 30.0, min: 20 },
  { name: "Limpeza e Troca de Roupa de Cama", price: 25.0, min: 20 },
  { name: "Organização Interna de Despensa", price: 45.0, min: 40 },
  { name: "Limpeza e Desinfecção de Caixas de Areia / Pet", price: 35.0, min: 30 },
  { name: "Lavagem de Louças Acumuladas na Pia", price: 35.0, min: 30 },
  { name: "Limpeza de Lustres e Luminárias de Cristal", price: 50.0, min: 40 },
  { name: "Tratamento e Polimento de Piso de Madeira", price: 80.0, min: 60 },
  { name: "Remoção de Mofo e Fungos de Azulejos", price: 65.0, min: 45 },
  { name: "Limpeza de Paredes e Rodapés", price: 70.0, min: 60 },
  { name: "Higienização de Colchão Antiácaro", price: 75.0, min: 45 },
  { name: "Limpeza de Armários de Cozinha por Dentro", price: 60.0, min: 60 },
  { name: "Limpeza de Filtros de Ar-Condicionado", price: 40.0, min: 30 },
  { name: "Aplicação de Cera Protetora em Pisos", price: 55.0, min: 45 },
  { name: "Aspiração Profunda de Cortinas e Persianas", price: 45.0, min: 30 },
];

// 20 Profissionais Diaristas / Especialistas
const PROFESSIONALS_DATA = [
  { name: "Maria Clara Santos", role: "Diarista Especialista & Passadeira", comm: 60 },
  { name: "Ana Paula Ferreira", role: "Especialista em Pós-Obra e Limpeza Pesada", comm: 65 },
  { name: "Juliana Rodrigues", role: "Supervisora de Limpeza Residencial", comm: 60 },
  { name: "Patrícia de Oliveira", role: "Especialista em Higienização e Sanitização", comm: 65 },
  { name: "Camila Guimarães", role: "Diarista Residencial & Organização de Ambientes", comm: 60 },
  { name: "Fernanda Alves", role: "Especialista em Limpeza Comercial e Clínicas", comm: 60 },
  { name: "Beatriz Lima Rocha", role: "Diarista Padrão Ouro & Cuidados Domésticos", comm: 60 },
  { name: "Renata Barbosa", role: "Especialista em Tratamento de Pisos e Vidros", comm: 65 },
  { name: "Luciana Costa Ramos", role: "Diarista Master & Organização de Closets", comm: 60 },
  { name: "Vanessa Martins", role: "Especialista em Limpeza Profunda e Cozinhas", comm: 60 },
  { name: "Débora Silveira", role: "Diarista Residencial & Limpeza Fina", comm: 60 },
  { name: "Simone Peixoto", role: "Especialista em Limpeza Pós-Mudança", comm: 65 },
  { name: "Elaine Cardoso", role: "Diarista Master & Tratamento de Superfícies", comm: 60 },
  { name: "Tatiane Mendes", role: "Especialista em Sofás, Carpetes e Estofados", comm: 65 },
  { name: "Cristiane Farias", role: "Diarista & Limpeza de Consultórios Médicos", comm: 60 },
  { name: "Aline Pacheco", role: "Especialista em Desinfecção de Ambientes Pet", comm: 60 },
  { name: "Carla Antunes", role: "Diarista Residencial Ágil & Cuidadosa", comm: 60 },
  { name: "Adriana Siqueira", role: "Especialista em Fachadas Internas e Vidros", comm: 65 },
  { name: "Valéria Guedes", role: "Diarista Master & Serviços Especiais", comm: 60 },
  { name: "Sandra Nascimento", role: "Supervisora de Equipes e Pós-Obra", comm: 70 },
];

const FIRST_NAMES = [
  "Lucas", "Mariana", "Gabriel", "Beatriz", "Rodrigo", "Juliana", "Felipe", "Larissa",
  "Guilherme", "Camila", "Matheus", "Fernanda", "Gustavo", "Amanda", "Bruno", "Letícia",
  "Diego", "Natália", "Leonardo", "Bruna", "Vinícius", "Carolina", "Rafael", "Jéssica",
  "Thiago", "Isabela", "Alexandre", "Luana", "Eduardo", "Gabriela", "Marcelo", "Bianca",
  "Caio", "Renata", "Henrique", "Vitória", "André", "Vanessa", "Murilo", "Daniela",
  "Arthur", "Thais", "Danilo", "Aline", "Igor", "Tatiane", "Samuel", "Débora", "Victor", "Priscila"
];

const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira",
  "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes",
  "Soares", "Fernandes", "Vieira", "Barbosa", "Rocha", "Dias", "Nascimento", "Andrade",
  "Moreira", "Nunes", "Marques", "Machado", "Mendes", "Freitas", "Cardoso", "Ramos",
  "Gonçalves", "Santana", "Teixeira", "Pinto", "Correia", "Castro", "Macedo", "Duarte"
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedCleaningMassive() {
  console.log(`\n${c.magenta}${c.bold}================================================================================${c.reset}`);
  console.log(`${c.magenta}${c.bold}   🧹 MEGA TESTE DE STRESS SUPREMO: EMPRESA DE CLEANER (2.000 AGENDAMENTOS)     ${c.reset}`);
  console.log(`${c.magenta}${c.bold}================================================================================${c.reset}\n`);

  const startTime = Date.now();

  try {
    // 1. Obter Plano
    let plan = await db.plan.findFirst();
    if (!plan) {
      plan = await db.plan.create({
        data: {
          tier: "ADVANCED",
          displayName: "Plano Advanced",
          description: "Plano completo",
          priceMonthly: 149.9,
          priceYearly: 1499.0,
          order: 1,
        },
      });
    }

    // 2. Obter Usuário Admin
    const allUsers = await db.user.findMany();
    let adminUser = allUsers[0];
    if (!adminUser) {
      adminUser = await db.user.create({
        data: {
          id: "usr_admin_cleaner",
          name: "CleanPro Admin Geral",
          email: "admin@cleanpro.com",
          emailVerified: true,
        },
      });
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

    // 3. Criar Empresa de Limpeza
    const slug = "cleanpro-diaristas";
    const existingCompany = await db.company.findUnique({ where: { slug } });
    if (existingCompany) {
      console.log(`  ${c.yellow}Limpando registros anteriores da empresa '${slug}'...${c.reset}`);
      await deleteCompanyCompletely(existingCompany.id);
    }

    const company = await db.company.create({
      data: {
        name: "CleanPro Excellence & Diaristas",
        slug,
        businessType: "HOME_CLEANING",
        currency: "BRL",
        locale: "pt-BR",
        timezone: "America/Sao_Paulo",
        planId: plan.id,
        isActive: true,
        maxAllowedNoShows: 2,
        minCancellationNoticeHours: 24,
      },
    });

    // Vincular todos os usuários do banco como OWNER
    for (const u of (allUsers.length > 0 ? allUsers : [adminUser])) {
      await db.companyUser.create({
        data: {
          companyId: company.id,
          userId: u.id,
          role: "OWNER",
          isActive: true,
        },
      });
    }

    console.log(`  ${c.green}✔ Empresa '${company.name}' criada com sucesso! (Slug: ${company.slug})${c.reset}`);

    // 4. Criar os 20 Profissionais
    console.log(`  ${c.cyan}Cadastrando 20 Profissionais Especialistas...${c.reset}`);
    const createdProfessionals = [];
    for (const p of PROFESSIONALS_DATA) {
      const prof = await db.professional.create({
        data: {
          companyId: company.id,
          name: p.name,
          roleTitle: p.role,
          commissionPercentage: p.comm,
          productCommissionRate: 10,
          isActive: true,
        },
      });
      createdProfessionals.push(prof);
    }
    console.log(`  ${c.green}✔ 20 Profissionais cadastrados com sucesso!${c.reset}`);

    // 5. Criar os 20 Serviços Principais
    console.log(`  ${c.cyan}Cadastrando 20 Serviços de Limpeza...${c.reset}`);
    const srvCategory = await db.service.create({
      data: {
        companyId: company.id,
        name: "Serviços de Limpeza & Diárias",
        order: 1,
        isActive: true,
      },
    });

    const createdServiceTypes = [];
    for (let i = 0; i < SERVICES_DATA.length; i++) {
      const s = SERVICES_DATA[i];
      const st = await db.serviceType.create({
        data: {
          companyId: company.id,
          serviceId: srvCategory.id,
          name: s.name,
          description: s.desc,
          price: s.price,
          estimatedMinutes: s.min,
          order: i + 1,
          isActive: true,
        },
      });
      createdServiceTypes.push(st);
    }
    console.log(`  ${c.green}✔ 20 Serviços criados com sucesso!${c.reset}`);

    // 6. Criar os 20 Serviços Extras
    console.log(`  ${c.cyan}Cadastrando 20 Serviços Extras / Opcionais...${c.reset}`);
    const createdExtraServices = [];
    for (let i = 0; i < EXTRA_SERVICES_DATA.length; i++) {
      const e = EXTRA_SERVICES_DATA[i];
      const extra = await db.extraService.create({
        data: {
          companyId: company.id,
          name: e.name,
          price: e.price,
          estimatedMinutes: e.min,
          order: i + 1,
          isActive: true,
        },
      });
      createdExtraServices.push(extra);
    }
    console.log(`  ${c.green}✔ 20 Serviços Extras criados com sucesso!${c.reset}`);

    // 7. Criar Agenda e Configuração Pública
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const agenda = await db.agenda.create({
      data: {
        companyId: company.id,
        name: "Escala Geral das Diaristas",
        status: "ACTIVE",
        startDate: todayStr,
        startTime: "08:00",
        endTime: "19:00",
        intervalMinutes: 60,
        workingDays: [1, 2, 3, 4, 5], // Segunda a Sexta
        createdById: adminUser.id,
        professionals: {
          create: createdProfessionals.map((p) => ({ professionalId: p.id })),
        },
      },
    });

    const bookingConfig = await db.bookingConfig.create({
      data: {
        companyId: company.id,
        agendaId: agenda.id,
        name: "Agendamento de Diaristas & Limpeza",
        status: "PUBLISHED",
        allowPartialService: true,
        createdById: adminUser.id,
        serviceTypes: {
          create: createdServiceTypes.map((s) => ({ serviceTypeId: s.id })),
        },
        extraServices: {
          create: createdExtraServices.map((e) => ({ extraServiceId: e.id })),
        },
      },
    });

    // Formas de Pagamento
    await db.companyPaymentMethod.createMany({
      data: [
        { companyId: company.id, kind: "STRIPE_CARD", label: "Cartão de Crédito / Débito", displayOrder: 1, isActive: true },
        { companyId: company.id, kind: "MERCADOPAGO_PIX", label: "PIX Antecipado", displayOrder: 2, isActive: true },
        { companyId: company.id, kind: "MANUAL", label: "Faturado / Boleto 15 Dias", displayOrder: 3, isActive: true },
      ],
    });

    // 8. Gerar 500 Clientes Únicos
    console.log(`  ${c.cyan}Cadastrando 500 Clientes únicos no banco de dados...${c.reset}`);
    const createdCustomers = [];
    for (let i = 0; i < 500; i++) {
      const fn = FIRST_NAMES[i % FIRST_NAMES.length];
      const ln = LAST_NAMES[(i * 3 + Math.floor(i / 10)) % LAST_NAMES.length];
      const phone = `(11) 9${String(70000000 + i).slice(0, 4)}-${String(1000 + i)}`;
      const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@exemplo.com`;

      const cust = await db.customer.create({
        data: {
          companyId: company.id,
          firstName: fn,
          lastName: ln,
          email,
          phone,
          noShowCount: i % 25 === 0 ? 1 : 0, // Alguns com no-show histórico
        },
      });
      createdCustomers.push(cust);
    }
    console.log(`  ${c.green}✔ 500 Clientes cadastrados com sucesso!${c.reset}`);

    // 9. Gerar os 2.000 Agendamentos Massivos
    // 50 agendamentos por dia em 40 dias úteis (Segunda a Sexta)
    console.log(`\n  ${c.cyan}Iniciando inserção massiva de 2.000 agendamentos (50 por dia, 40 dias úteis)...${c.reset}`);

    // Gerar os 40 dias úteis (pula sábados e domingos)
    const workDays: string[] = [];
    let curDate = new Date(today);
    // Começa há 20 dias atrás para ter histórico passado rico e 20 dias no futuro
    curDate.setDate(today.getDate() - 28);

    while (workDays.length < 40) {
      const dayOfWeek = curDate.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workDays.push(curDate.toISOString().split("T")[0]);
      }
      curDate.setDate(curDate.getDate() + 1);
    }

    const timeSlots = [
      { start: "08:00", end: "12:00" },
      { start: "08:30", end: "12:30" },
      { start: "09:00", end: "13:00" },
      { start: "09:30", end: "13:30" },
      { start: "10:00", end: "14:00" },
      { start: "13:00", end: "17:00" },
      { start: "13:30", end: "17:30" },
      { start: "14:00", end: "18:00" },
      { start: "14:30", end: "18:30" },
      { start: "15:00", end: "19:00" },
    ];

    let totalCreated = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let rescheduledCount = 0;
    let noShowCount = 0;
    let confirmedCount = 0;
    let inProgressCount = 0;
    let multiStaffCount = 0;
    let totalRevenue = 0;
    let totalCommissions = 0;

    // Loop dos 40 dias úteis x 50 agendamentos/dia = 2.000 agendamentos
    for (let dayIdx = 0; dayIdx < 40; dayIdx++) {
      const dateStr = workDays[dayIdx];
      const isPast = dateStr < todayStr;
      const isToday = dateStr === todayStr;

      for (let slotIdx = 0; slotIdx < 50; slotIdx++) {
        const bookingIndex = totalCreated;
        const customer = createdCustomers[bookingIndex % createdCustomers.length];
        const primaryService = createdServiceTypes[bookingIndex % createdServiceTypes.length];
        const extra1 = createdExtraServices[(bookingIndex * 2) % createdExtraServices.length];
        const extra2 = createdExtraServices[(bookingIndex * 3 + 1) % createdExtraServices.length];

        const baseSlot = timeSlots[slotIdx % timeSlots.length];
        const hasExtraService = slotIdx % 2 === 0;
        const hasSecondExtra = slotIdx % 5 === 0;

        let servicePrice = Number(primaryService.price);
        if (hasExtraService) servicePrice += Number(extra1.price);
        if (hasSecondExtra) servicePrice += Number(extra2.price);

        // Distribuição de Profissionais
        const isMultiStaff = multiStaffCount < 30 && (bookingIndex % 60 === 0);
        const primaryProf = createdProfessionals[slotIdx % createdProfessionals.length];
        const secondaryProf = isMultiStaff
          ? createdProfessionals[(slotIdx + 1) % createdProfessionals.length]
          : null;

        if (isMultiStaff) multiStaffCount++;

        // Status & Ciclo de Vida
        let status: any = "CONFIRMED";
        let paymentStatus: any = "PENDING";
        let cancelledAt: Date | null = null;
        let cancellationReason: string | null = null;
        let rescheduledAt: Date | null = null;
        let scheduledDate = dateStr;
        let finalTotal = servicePrice;
        let structuredNotes: any = null;

        if (isPast) {
          // PASSADO (< hoje): Apenas COMPLETED (sucesso), NO_SHOW ou CANCELLED
          if (bookingIndex % 15 === 0) {
            // Cancelado
            status = "CANCELLED";
            paymentStatus = "REFUNDED";
            cancelledAt = new Date();
            cancellationReason = randomChoice([
              "Imprevisto de viagem do cliente",
              "Reforma no condomínio impediu entrada",
              "Cancelado com antecedência pelo WhatsApp",
              "Mudança de planos da família",
            ]);
            cancelledCount++;
          } else if (bookingIndex % 25 === 0) {
            // No-Show
            status = "NO_SHOW";
            paymentStatus = "PENDING";
            noShowCount++;
          } else {
            // Finalizado com Sucesso no Passado (COMPLETED + PAID)
            status = "COMPLETED";
            paymentStatus = "PAID";
            completedCount++;

            // Inserção de Acréscimos de Finalização e Descontos
            const hasSurcharge = bookingIndex % 3 === 0;
            const hasDiscount = bookingIndex % 7 === 0;

            const additionalItems: any[] = [];
            let discountObj: any = null;

            if (hasSurcharge) {
              const surchargeAmount = randomChoice([25.0, 30.0, 45.0, 60.0]);
              const reason = randomChoice([
                "Taxa Adicional (Pia com louças muito acumuladas)",
                "Taxa Adicional (Remoção pesada de gordura queimada)",
                "Taxa Adicional (Área externa com folhas e lama)",
                "Taxa Adicional (Incrustação severa de calcário no box)",
              ]);
              additionalItems.push({
                description: reason,
                amount: surchargeAmount,
                category: "SURCHARGE",
                parentServiceName: primaryService.name,
              });
              finalTotal += surchargeAmount;
            }

            if (hasDiscount) {
              const discountVal = 10; // 10%
              const discountAmt = Number((finalTotal * (discountVal / 100)).toFixed(2));
              discountObj = {
                type: "PERCENTAGE",
                value: discountVal,
                amount: discountAmt,
                reason: "Desconto comercial por atraso de 15 minutos",
              };
              finalTotal -= discountAmt;
            }

            if (additionalItems.length > 0 || discountObj) {
              structuredNotes = JSON.stringify({
                additionalItems,
                discount: discountObj,
                multiStaff: secondaryProf ? [secondaryProf.name] : undefined,
              });
            }

            totalRevenue += finalTotal;
            const commRate = Number(primaryProf.commissionPercentage) / 100;
            totalCommissions += finalTotal * commRate;
          }
        } else if (isToday) {
          // HOJE:
          // - Manhã (slotIdx < 15): Concluído
          // - Agora (slotIdx < 30): Em Andamento
          // - Tarde/Noite: Confirmado
          if (slotIdx < 15) {
            status = "COMPLETED";
            paymentStatus = "PAID";
            completedCount++;
            totalRevenue += finalTotal;
            const commRate = Number(primaryProf.commissionPercentage) / 100;
            totalCommissions += finalTotal * commRate;
          } else if (slotIdx < 30) {
            status = "IN_PROGRESS";
            paymentStatus = "PENDING";
            inProgressCount++;
          } else {
            status = "CONFIRMED";
            paymentStatus = "PENDING";
            confirmedCount++;
          }
        } else {
          // FUTURO (> hoje): ESTRITAMENTE APENAS CONFIRMED, RESCHEDULED OU CANCELLED (NUNCA COMPLETED NEM IN_PROGRESS)
          if (bookingIndex % 18 === 0) {
            // Cancelado no futuro
            status = "CANCELLED";
            paymentStatus = "PENDING";
            cancelledAt = new Date();
            cancellationReason = "Cancelado com antecedência pelo cliente";
            cancelledCount++;
          } else if (bookingIndex % 12 === 0) {
            // Reagendado no futuro para outra data
            status = "CONFIRMED";
            paymentStatus = "PENDING";
            rescheduledAt = new Date();
            const futureDate = new Date(dateStr);
            futureDate.setDate(futureDate.getDate() + 7);
            scheduledDate = futureDate.toISOString().split("T")[0];
            rescheduledCount++;
          } else {
            // Confirmado aguardando data
            status = "CONFIRMED";
            paymentStatus = "PENDING";
            confirmedCount++;
          }
        }

        // Criar Estimate
        const estimate = await db.estimate.create({
          data: {
            companyId: company.id,
            bookingConfigId: bookingConfig.id,
            customerName: `${customer.firstName} ${customer.lastName}`,
            customerEmail: customer.email,
            subtotal: servicePrice,
            total: finalTotal,
            notes: structuredNotes,
            status: status === "COMPLETED" ? "CONVERTED" : "PENDING",
            serviceTypes: {
              create: {
                serviceTypeId: primaryService.id,
                quantity: 1,
                unitPrice: Number(primaryService.price),
                subtotal: Number(primaryService.price),
              },
            },
            extraServices: hasExtraService
              ? {
                  create: [
                    {
                      extraServiceId: extra1.id,
                      quantity: 1,
                      unitPrice: Number(extra1.price),
                      subtotal: Number(extra1.price),
                    },
                    ...(hasSecondExtra
                      ? [
                          {
                            extraServiceId: extra2.id,
                            quantity: 1,
                            unitPrice: Number(extra2.price),
                            subtotal: Number(extra2.price),
                          },
                        ]
                      : []),
                  ],
                }
              : undefined,
          },
        });

        // Criar Booking
        const booking = await db.booking.create({
          data: {
            companyId: company.id,
            bookingConfigId: bookingConfig.id,
            agendaId: agenda.id,
            estimateId: estimate.id,
            customerId: customer.id,
            professionalId: primaryProf.id,
            scheduledDate,
            scheduledStartTime: baseSlot.start,
            scheduledEndTime: baseSlot.end,
            status,
            paymentMethod: bookingIndex % 2 === 0 ? "CARD" : "PIX",
            paymentStatus,
            cancelledAt,
            cancellationReason,
            rescheduledAt,
          },
        });

        // Detalhes do Cliente
        await db.bookingCustomerDetail.create({
          data: {
            bookingId: booking.id,
            firstName: customer.firstName,
            lastName: customer.lastName ?? "",
            email: customer.email,
            phone: customer.phone ?? "(11) 98888-0000",
            address: `Rua das Palmeiras, ${100 + (bookingIndex % 500)}`,
            city: "São Paulo",
            zip: "04500-000",
          },
        });

        totalCreated++;
      }

      if ((dayIdx + 1) % 10 === 0 || dayIdx === 39) {
        console.log(`  ${c.yellow}Progresso:${c.reset} ${totalCreated} / 2.000 agendamentos inseridos (${Math.round((totalCreated / 2000) * 100)}%)...`);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n${c.green}${c.bold}================================================================================${c.reset}`);
    console.log(`${c.green}${c.bold}   🎉 TESTE DE STRESS SUPREMO CONCLUÍDO COM SUCESSO ABSOLUTO! (${elapsed}s)       ${c.reset}`);
    console.log(`${c.green}${c.bold}================================================================================${c.reset}\n`);

    console.log(`  🏢 ${c.bold}Empresa Criada:${c.reset} CleanPro Excellence & Diaristas`);
    console.log(`  🔗 ${c.bold}Painel de Agendamentos:${c.reset} /${company.slug}/agendamentos`);
    console.log(`  🌐 ${c.bold}Agendamento Online Público:${c.reset} /book/${company.slug}/${bookingConfig.id}`);
    console.log(`  🛠️ ${c.bold}Serviços Principais Cadastrados:${c.reset} ${createdServiceTypes.length}`);
    console.log(`  ✨ ${c.bold}Serviços Extras Cadastrados:${c.reset} ${createdExtraServices.length}`);
    console.log(`  👩‍💼 ${c.bold}Profissionais Diaristas Cadastradas:${c.reset} ${createdProfessionals.length}`);
    console.log(`  👥 ${c.bold}Clientes Únicos Cadastrados:${c.reset} ${createdCustomers.length}`);
    console.log(`  📅 ${c.bold}Total de Agendamentos Inseridos:${c.reset} ${totalCreated} (50 / dia ao longo de 40 dias úteis)`);
    console.log(`  👭 ${c.bold}Agendamentos com Dupla de Diaristas:${c.reset} ${multiStaffCount}`);
    console.log(`  ✔  ${c.bold}Finalizados com Sucesso (COMPLETED + PAID):${c.reset} ${completedCount}`);
    console.log(`  ❌ ${c.bold}Cancelamentos com Motivo Registrado:${c.reset} ${cancelledCount}`);
    console.log(`  🔄 ${c.bold}Reagendamentos com Histórico Registrado:${c.reset} ${rescheduledCount}`);
    console.log(`  🚫 ${c.bold}No-Show / Faltas com Registro:${c.reset} ${noShowCount}`);
    console.log(`  ⏳ ${c.bold}Em Andamento / Confirmados Futuros:${c.reset} ${inProgressCount + confirmedCount}`);
    console.log(`  💰 ${c.bold}Faturamento Faturado Consolidado:${c.reset} R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
    console.log(`  💵 ${c.bold}Comissões Totais Calculadas para as Diaristas:${c.reset} R$ ${totalCommissions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`);

  } catch (err) {
    console.error("Erro fatal no teste de stress supremo:", err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

seedCleaningMassive();
