import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

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

const CLIENT_NAMES = [
  { first: "Carlos", last: "Eduardo Silva", phone: "(11) 98111-0001" },
  { first: "Felipe", last: "Martins Costa", phone: "(11) 98111-0002" },
  { first: "Rodrigo", last: "Oliveira Santos", phone: "(11) 98111-0003" },
  { first: "Mateus", last: "Souza Lima", phone: "(11) 98111-0004" },
  { first: "Gustavo", last: "Lima Pereira", phone: "(11) 98111-0005" },
  { first: "Bruno", last: "Santos Rocha", phone: "(11) 98111-0006" },
  { first: "André", last: "Almeida Dias", phone: "(11) 98111-0007" },
  { first: "Lucas", last: "Ribeiro Guimarães", phone: "(11) 98111-0008" },
  { first: "Diego", last: "Carvalho Nogueira", phone: "(11) 98111-0009" },
  { first: "Thiago", last: "Ferreira Gomes", phone: "(11) 98111-0010" },
  { first: "Gabriel", last: "Mendes Castro", phone: "(11) 98111-0011" },
  { first: "Rafael", last: "Barros Teixeira", phone: "(11) 98111-0012" },
  { first: "Marcelo", last: "Freitas Barbosa", phone: "(11) 98111-0013" },
  { first: "Leonardo", last: "Monteiro Cardoso", phone: "(11) 98111-0014" },
  { first: "Vinícius", last: "Moreira Ramos", phone: "(11) 98111-0015" },
  { first: "Alexandre", last: "Macedo Vieira", phone: "(11) 98111-0016" },
  { first: "Guilherme", last: "Borges Duarte", phone: "(11) 98111-0017" },
  { first: "Henrique", last: "Pinto Farias", phone: "(11) 98111-0018" },
  { first: "Leandro", last: "Campos Pacheco", phone: "(11) 98111-0019" },
  { first: "Eduardo", last: "Reis Peixoto", phone: "(11) 98111-0020" },
  { first: "Caio", last: "Fonseca Cunha", phone: "(11) 98111-0021" },
  { first: "Murilo", last: "Lopes Moura", phone: "(11) 98111-0022" },
  { first: "Otávio", last: "Alves Antunes", phone: "(11) 98111-0023" },
  { first: "Danilo", last: "Cavalcanti Meireles", phone: "(11) 98111-0024" },
  { first: "Igor", last: "Prado Siqueira", phone: "(11) 98111-0025" },
  { first: "Arthur", last: "Tavares Viana", phone: "(11) 98111-0026" },
  { first: "Samuel", last: "Queiroz Fontes", phone: "(11) 98111-0027" },
  { first: "Victor", last: "Guedes Silveira", phone: "(11) 98111-0028" },
  { first: "Renan", last: "Correia Aguiar", phone: "(11) 98111-0029" },
  { first: "Yuri", last: "Nascimento Franco", phone: "(11) 98111-0030" },
  { first: "Breno", last: "Arruda Padilha", phone: "(11) 98111-0031" },
  { first: "Julio", last: "Cesar Brandão", phone: "(11) 98111-0032" },
  { first: "Fernando", last: "Magalhães Brito", phone: "(11) 98111-0033" },
  { first: "Cristiano", last: "Azevedo Teles", phone: "(11) 98111-0034" },
  { first: "Alan", last: "Dantas Vasconcelos", phone: "(11) 98111-0035" },
  { first: "Ronaldo", last: "Bezerra Chaves", phone: "(11) 98111-0036" },
  { first: "Douglas", last: "Pires Maciel", phone: "(11) 98111-0037" },
  { first: "Anderson", last: "Severo Furtado", phone: "(11) 98111-0038" },
  { first: "Robson", last: "Assis Neves", phone: "(11) 98111-0039" },
  { first: "Wellington", last: "Lacerda Amaral", phone: "(11) 98111-0040" },
  { first: "Wesley", last: "Santoro Meneses", phone: "(11) 98111-0041" },
  { first: "Everton", last: "Passos Godoy", phone: "(11) 98111-0042" },
  { first: "Fabio", last: "Figueiredo Sales", phone: "(11) 98111-0043" },
  { first: "Mauricio", last: "Vargas Couto", phone: "(11) 98111-0044" },
  { first: "Cesar", last: "Luz Rezende", phone: "(11) 98111-0045" },
  { first: "Denis", last: "Valente Xavier", phone: "(11) 98111-0046" },
  { first: "Erick", last: "Bandeira Frota", phone: "(11) 98111-0047" },
  { first: "Hugo", last: "Campelo Sarmento", phone: "(11) 98111-0048" },
  { first: "Luciano", last: "Morais Bitencourt", phone: "(11) 98111-0049" },
  { first: "Marcio", last: "Seixas Medeiros", phone: "(11) 98111-0050" },
];

const EXTRA_PRODUCTS = [
  { description: "Pomada Modeladora Efeito Matte 80g", amount: 35.0, category: "PRODUCT" },
  { description: "Óleo Hidratante para Barba 30ml", amount: 28.0, category: "PRODUCT" },
  { description: "Shampoo Anticaspa Fortificante 250ml", amount: 42.0, category: "PRODUCT" },
  { description: "Cerveja Heineken Long Neck 330ml", amount: 12.0, category: "PRODUCT" },
  { description: "Cerveja Corona Extra 330ml", amount: 14.0, category: "PRODUCT" },
  { description: "Refrigerante Coca-Cola Zero Lata", amount: 7.0, category: "PRODUCT" },
  { description: "Energético Red Bull Energy Drink 250ml", amount: 15.0, category: "PRODUCT" },
  { description: "Água Mineral Crystal com Gás 500ml", amount: 5.0, category: "PRODUCT" },
  { description: "Café Expresso Nespresso Cápsula", amount: 6.0, category: "PRODUCT" },
];

async function seedBarbershopMass() {
  console.log(`\n${c.magenta}${c.bold}======================================================================${c.reset}`);
  console.log(`${c.magenta}${c.bold}   💈 GERADOR DE MASSA DE DADOS: BARBEARIA PREMIUM (50 AGENDAMENTOS)  ${c.reset}`);
  console.log(`${c.magenta}${c.bold}======================================================================${c.reset}\n`);

  try {
    // 1. Obter ou criar Plano
    let plan = await db.plan.findFirst();
    if (!plan) {
      plan = await db.plan.create({
        data: {
          tier: "ADVANCED",
          displayName: "Plano Advanced",
          description: "Plano com todos os recursos",
          priceMonthly: 149.9,
          priceYearly: 1499.0,
          order: 1,
        },
      });
    }

    // 2. Criar ou Obter Usuário Admin
    const allUsers = await db.user.findMany();
    let adminUser = allUsers[0];
    if (!adminUser) {
      adminUser = await db.user.create({
        data: {
          id: "usr_admin_barber",
          name: "Barbeiro Master Admin",
          email: "admin@barbearia.com",
          emailVerified: true,
        },
      });
    }

    // 3. Criar Empresa de Barbearia com slug fácil
    const slug = "barbearia-vintage";
    
    // Limpar se já existir para manter dados frescos e precisos
    const existingCompany = await db.company.findUnique({ where: { slug } });
    if (existingCompany) {
      console.log(`  ${c.yellow}Limpando dados anteriores da barbearia '${slug}'...${c.reset}`);
      await db.company.delete({ where: { id: existingCompany.id } });
    }

    const company = await db.company.create({
      data: {
        name: "Vintage Barber Club & Lounge",
        slug,
        businessType: "BARBERSHOP",
        currency: "BRL",
        locale: "pt-BR",
        timezone: "America/Sao_Paulo",
        planId: plan.id,
        isActive: true,
        maxAllowedNoShows: 2,
        minCancellationNoticeHours: 2,
      },
    });

    // Vincular TODOS os usuários do banco como OWNER para que quem logar já tenha acesso
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

    // 4. Criar Profissionais
    const profPedro = await db.professional.create({
      data: {
        companyId: company.id,
        name: "Pedro Silveira",
        roleTitle: "Barbeiro Master & Especialista em Degradê",
        bio: "Mais de 10 anos de experiência em cortes clássicos e visagismo masculino.",
        commissionPercentage: 50,
        productCommissionRate: 15,
        isActive: true,
      },
    });

    const profPaulo = await db.professional.create({
      data: {
        companyId: company.id,
        name: "Paulo Henrique",
        roleTitle: "Barbeiro & Especialista em Barboterapia",
        bio: "Especialista em toalha quente, alinhamento de barba e pigmentação.",
        commissionPercentage: 50,
        productCommissionRate: 15,
        isActive: true,
      },
    });

    console.log(`  ${c.green}✔ 2 Profissionais criados: ${profPedro.name} e ${profPaulo.name}${c.reset}`);

    // 5. Criar Serviços e Serviços Extras
    const srvCortes = await db.service.create({
      data: {
        companyId: company.id,
        name: "Cabelo & Estilo",
        order: 1,
        isActive: true,
      },
    });

    const stCorte = await db.serviceType.create({
      data: {
        companyId: company.id,
        serviceId: srvCortes.id,
        name: "Corte Masculino Tradicional / Degradê",
        description: "Corte com tesoura ou máquina, acabamento com navalha e lavagem.",
        price: 45.0,
        estimatedMinutes: 30,
        order: 1,
        isActive: true,
      },
    });

    const srvBarba = await db.service.create({
      data: {
        companyId: company.id,
        name: "Barba & Cuidados",
        order: 2,
        isActive: true,
      },
    });

    const stBarba = await db.serviceType.create({
      data: {
        companyId: company.id,
        serviceId: srvBarba.id,
        name: "Barba Terapêutica (Toalha Quente + Navalha)",
        description: "Alinhamento com toalha quente, esfoliação facial e massagem.",
        price: 35.0,
        estimatedMinutes: 30,
        order: 2,
        isActive: true,
      },
    });

    const stCombo = await db.serviceType.create({
      data: {
        companyId: company.id,
        serviceId: srvCortes.id,
        name: "Combo Completo: Cabelo + Barba + Lavagem",
        description: "Experiência completa com visagismo e finalização premium.",
        price: 75.0,
        estimatedMinutes: 60,
        order: 3,
        isActive: true,
      },
    });

    const stPezinho = await db.serviceType.create({
      data: {
        companyId: company.id,
        serviceId: srvCortes.id,
        name: "Acabamento & Pezinho",
        description: "Alinhamento do contorno do cabelo e sobrancelhas na navalha.",
        price: 20.0,
        estimatedMinutes: 15,
        order: 4,
        isActive: true,
      },
    });

    const extraSobrancelha = await db.extraService.create({
      data: {
        companyId: company.id,
        name: "Design de Sobrancelha na Navalha",
        price: 15.0,
        estimatedMinutes: 10,
        order: 1,
        isActive: true,
      },
    });

    const extraHidratacao = await db.extraService.create({
      data: {
        companyId: company.id,
        name: "Hidratação Capilar e Esfoliação de Couro",
        price: 25.0,
        estimatedMinutes: 15,
        order: 2,
        isActive: true,
      },
    });

    // 6. Criar Agenda e Configuração Pública
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const agenda = await db.agenda.create({
      data: {
        companyId: company.id,
        name: "Grade Geral da Barbearia",
        status: "ACTIVE",
        startDate: todayStr,
        startTime: "09:00",
        endTime: "20:00",
        intervalMinutes: 30,
        workingDays: [0, 1, 2, 3, 4, 5, 6],
        createdById: adminUser.id,
        professionals: {
          create: [
            { professionalId: profPedro.id },
            { professionalId: profPaulo.id },
          ],
        },
      },
    });

    const bookingConfig = await db.bookingConfig.create({
      data: {
        companyId: company.id,
        agendaId: agenda.id,
        name: "Agendamento Online - Barbearia",
        status: "PUBLISHED",
        allowPartialService: true,
        createdById: adminUser.id,
        serviceTypes: {
          create: [
            { serviceTypeId: stCorte.id },
            { serviceTypeId: stBarba.id },
            { serviceTypeId: stCombo.id },
            { serviceTypeId: stPezinho.id },
          ],
        },
        extraServices: {
          create: [
            { extraServiceId: extraSobrancelha.id },
            { extraServiceId: extraHidratacao.id },
          ],
        },
      },
    });

    // Formas de Pagamento da Barbearia
    await db.companyPaymentMethod.createMany({
      data: [
        {
          companyId: company.id,
          kind: "MERCADOPAGO_PIX",
          label: "PIX no Balcão ou QR Code",
          displayOrder: 1,
          isActive: true,
        },
        {
          companyId: company.id,
          kind: "STRIPE_CARD",
          label: "Cartão de Crédito / Débito",
          displayOrder: 2,
          isActive: true,
        },
        {
          companyId: company.id,
          kind: "MANUAL",
          label: "Dinheiro / Pagar no Balcão",
          displayOrder: 3,
          isActive: true,
        },
      ],
    });

    console.log(`  ${c.green}✔ Catálogo de Serviços e Agenda configurados!${c.reset}`);

    // 7. Gerar os 50 Agendamentos Distribuídos (10 por dia de Segunda a Sexta)
    console.log(`\n  ${c.cyan}Gerando 50 clientes e agendamentos realistas...${c.reset}`);

    // Calcular as 5 datas da semana (Segunda a Sexta)
    // Hoje é dia 0
    const weekDates: string[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      weekDates.push(d.toISOString().split("T")[0]);
    }

    // Slots de horários diários (10 horários das 09:00 às 18:30)
    const timeSlots = [
      { start: "09:00", end: "09:30" },
      { start: "10:00", end: "10:30" },
      { start: "11:00", end: "11:30" },
      { start: "11:30", end: "12:00" },
      { start: "14:00", end: "14:30" },
      { start: "14:30", end: "15:00" },
      { start: "15:30", end: "16:00" },
      { start: "16:30", end: "17:00" },
      { start: "17:30", end: "18:00" },
      { start: "18:30", end: "19:00" },
    ];

    const servicePool = [stCorte, stBarba, stCombo, stPezinho];
    const profPool = [profPedro.id, profPaulo.id, null]; // Pedro, Paulo ou Qualquer (null)

    let totalCreated = 0;
    let completedCount = 0;
    let noShowCount = 0;
    let rescheduledCount = 0;
    let confirmedCount = 0;
    let totalRevenue = 0;

    // 50 Clientes
    for (let i = 0; i < 50; i++) {
      const clientInfo = CLIENT_NAMES[i];
      const dayIndex = Math.floor(i / 10); // 0=Hoje (Segunda), 1=Terça, 2=Quarta, 3=Quinta, 4=Sexta
      const slotIndex = i % 10;
      const dateStr = weekDates[dayIndex];
      const slot = timeSlots[slotIndex];

      // Escolha do serviço
      const selectedService = servicePool[i % servicePool.length];
      const servicePrice = Number(selectedService.price);

      // Distribuição de profissionais (Pedro, Paulo ou Auto-atribuído)
      const chosenProfId = profPool[i % profPool.length];

      // Criação ou upsert do cliente
      const isTodayNoShow = dayIndex === 0 && slotIndex === 9; // O 10º agendamento de hoje é No-Show
      const customer = await db.customer.create({
        data: {
          companyId: company.id,
          firstName: clientInfo.first,
          lastName: clientInfo.last,
          email: `${clientInfo.first.toLowerCase()}.${clientInfo.last.split(" ")[0].toLowerCase()}${i}@gmail.com`,
          phone: clientInfo.phone,
          noShowCount: isTodayNoShow ? 1 : 0,
        },
      });

      // Criação do Estimate
      const estimate = await db.estimate.create({
        data: {
          companyId: company.id,
          bookingConfigId: bookingConfig.id,
          customerName: `${clientInfo.first} ${clientInfo.last}`,
          customerEmail: customer.email,
          subtotal: servicePrice,
          total: servicePrice,
          status: "CONVERTED",
          serviceTypes: {
            create: {
              serviceTypeId: selectedService.id,
              quantity: 1,
              unitPrice: servicePrice,
              subtotal: servicePrice,
            },
          },
        },
      });

      // Definir Estado do Agendamento:
      let bookingStatus: any = "CONFIRMED";
      let paymentStatus: any = "PENDING";
      let scheduledDate = dateStr;
      let rescheduledAt: Date | null = null;
      let finalBookingTotal = servicePrice;
      let estimateNotes: string | null = null;

      // ────────────────────────────────────────────────────────────────────────
      // REGRA 1: AGENDAMENTOS DE HOJE (Dia 0)
      // 9 Finalizados com Produtos Extras + 1 No-Show
      // ────────────────────────────────────────────────────────────────────────
      if (dayIndex === 0) {
        if (isTodayNoShow) {
          bookingStatus = "NO_SHOW";
          paymentStatus = "PENDING";
          noShowCount++;
        } else {
          bookingStatus = "COMPLETED";
          paymentStatus = "PAID";
          completedCount++;

          // Mesclar produtos extras:
          // - Alguns com 1 produto extra
          // - Alguns com > 2 produtos extras
          // - Alguns com nenhum produto extra
          const productMode = slotIndex % 3; // 0 = 1 produto, 1 = 3 produtos, 2 = nenhum
          const assignedItems: any[] = [];

          if (productMode === 0) {
            // 1 produto (ex: Cerveja R$ 12)
            const prod = EXTRA_PRODUCTS[3]; // Heineken
            assignedItems.push(prod);
            finalBookingTotal += prod.amount;
          } else if (productMode === 1) {
            // 3 produtos (ex: Pomada R$ 35 + Red Bull R$ 15 + Água R$ 5)
            const p1 = EXTRA_PRODUCTS[0]; // Pomada
            const p2 = EXTRA_PRODUCTS[6]; // Red Bull
            const p3 = EXTRA_PRODUCTS[7]; // Água
            assignedItems.push(p1, p2, p3);
            finalBookingTotal += p1.amount + p2.amount + p3.amount;
          }

          if (assignedItems.length > 0) {
            estimateNotes = JSON.stringify({ additionalItems: assignedItems });
            await db.estimate.update({
              where: { id: estimate.id },
              data: {
                subtotal: finalBookingTotal,
                total: finalBookingTotal,
                notes: estimateNotes,
              },
            });
          }

          totalRevenue += finalBookingTotal;
        }
      }

      // ────────────────────────────────────────────────────────────────────────
      // REGRA 2: AGENDAMENTOS DA SEMANA (Dias 1 a 4)
      // 5 Reagendados para a próxima semana
      // ────────────────────────────────────────────────────────────────────────
      else {
        // Selecionar 5 agendamentos distribuídos na semana para reagendar
        // (ex: índices i = 12, 23, 34, 41, 48)
        const isRescheduled = [12, 23, 34, 41, 48].includes(i);
        if (isRescheduled) {
          bookingStatus = "CONFIRMED";
          paymentStatus = "PENDING";
          rescheduledAt = new Date();
          // Move para a próxima semana (+7 dias)
          const nextWeekDate = new Date(today);
          nextWeekDate.setDate(today.getDate() + dayIndex + 7);
          scheduledDate = nextWeekDate.toISOString().split("T")[0];
          rescheduledCount++;
        } else {
          bookingStatus = "CONFIRMED";
          paymentStatus = "PENDING";
          confirmedCount++;
        }
      }

      // Criação do Booking
      const booking = await db.booking.create({
        data: {
          companyId: company.id,
          bookingConfigId: bookingConfig.id,
          agendaId: agenda.id,
          estimateId: estimate.id,
          customerId: customer.id,
          professionalId: chosenProfId ?? profPedro.id, // Auto-atribui ao Pedro se não escolhido
          scheduledDate,
          scheduledStartTime: slot.start,
          scheduledEndTime: slot.end,
          status: bookingStatus,
          paymentMethod: i % 2 === 0 ? "PIX" : "CARD",
          paymentStatus,
          rescheduledAt,
        },
      });

      // Detalhes do Cliente no Booking
      await db.bookingCustomerDetail.create({
        data: {
          bookingId: booking.id,
          firstName: clientInfo.first,
          lastName: clientInfo.last,
          email: customer.email,
          phone: clientInfo.phone,
          address: "Av. Paulista, 1000",
          city: "São Paulo",
          zip: "01310-100",
        },
      });

      // Slot no calendário (se não for no-show ou se for ativo)
      if (bookingStatus !== "NO_SHOW") {
        try {
          await db.bookingSlot.create({
            data: {
              bookingId: booking.id,
              agendaId: agenda.id,
              date: scheduledDate,
              startTime: slot.start,
              endTime: slot.end,
            },
          });
        } catch {
          // Ignora se colidir com slot
        }
      }

      totalCreated++;
    }

    console.log(`\n${c.green}${c.bold}======================================================================${c.reset}`);
    console.log(`${c.green}${c.bold}   🎉 MASSA DE DADOS GERADA COM SUCESSO ABSOLUTO!                      ${c.reset}`);
    console.log(`${c.green}${c.bold}======================================================================${c.reset}\n`);

    console.log(`  🏢 ${c.bold}Empresa:${c.reset} Vintage Barber Club & Lounge`);
    console.log(`  🔗 ${c.bold}Slug de Acesso no Painel:${c.reset} /${company.slug}/agendamentos`);
    console.log(`  🌐 ${c.bold}Link de Agendamento Online:${c.reset} /book/${company.slug}/${bookingConfig.id}`);
    console.log(`  👥 ${c.bold}Total de Clientes / Usuários:${c.reset} ${totalCreated}`);
    console.log(`  📅 ${c.bold}Distribuição Semanal:${c.reset} 10 por dia (Segunda a Sexta)`);
    console.log(`  ✔  ${c.bold}Agendamentos de Hoje Finalizados (COMPLETED + Produtos):${c.reset} ${completedCount}`);
    console.log(`  🚫 ${c.bold}Clientes com Falta / No-Show:${c.reset} ${noShowCount} (Registrado no histórico do cliente)`);
    console.log(`  🔄 ${c.bold}Agendamentos Reagendados (Próxima Semana):${c.reset} ${rescheduledCount}`);
    console.log(`  ⏳ ${c.bold}Agendamentos Confirmados / Futuros:${c.reset} ${confirmedCount}`);
    console.log(`  💰 ${c.bold}Faturamento Faturado Hoje (Serviços + Produtos):${c.reset} R$ ${totalRevenue.toFixed(2)}\n`);

  } catch (err) {
    console.error("Erro ao gerar massa de dados:", err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

seedBarbershopMass();
