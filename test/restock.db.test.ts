import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * A consulta de reposição contra o Postgres real.
 *
 * A classificação está coberta, pura, em `src/lib/restock.test.ts`. Aqui se
 * testa a SQL: o `LEFT JOIN` duplo com a janela de tempo, o `MIN(EXTRACT(DAY…))`
 * e os nomes de coluna em camelCase citados à mão. Nada disso passa por `tsc` —
 * uma coluna errada compila e explode na tela do dono.
 *
 * O caso mais importante é o do LEFT JOIN: um produto SEM nenhuma venda precisa
 * continuar aparecendo com `units_sold = 0`. Um `JOIN` comum o eliminaria da
 * lista, e o produto que nunca vendeu sumiria em vez de ser classificado como
 * parado.
 */

const enabled = process.env.RUN_DB_TESTS === "1";
const d = enabled ? describe : describe.skip;

const P = "vitest-restock";
const IDS = {
  company: `${P}-company`,
  user: `${P}-user`,
  girando: `${P}-produto-girando`,
  parado: `${P}-produto-parado`,
  sale: `${P}-sale`,
};

let db: typeof import("@/lib/db").db;

async function cleanup() {
  await db.saleItem.deleteMany({ where: { saleId: IDS.sale } });
  await db.posSale.deleteMany({ where: { companyId: IDS.company } });
  await db.stockMovement.deleteMany({
    where: { productId: { in: [IDS.girando, IDS.parado] } },
  });
  await db.product.deleteMany({ where: { companyId: IDS.company } });
  await db.companyUser.deleteMany({ where: { companyId: IDS.company } });
  await db.company.deleteMany({ where: { id: IDS.company } });
  await db.user.deleteMany({ where: { id: IDS.user } });
}

async function seed() {
  const plan = await db.plan.findFirst({ orderBy: { order: "asc" } });
  if (!plan) throw new Error("Sem planos no banco — rode o seed antes.");

  await db.user.create({
    data: { id: IDS.user, name: "Dono restock", email: `${IDS.user}@vitest.local`, emailVerified: true },
  });

  await db.company.create({
    data: {
      id: IDS.company,
      name: "Empresa restock",
      slug: `${P}-slug`,
      businessType: "BARBER",
      planId: plan.id,
      isActive: true,
    },
  });

  await db.companyUser.create({
    data: { companyId: IDS.company, userId: IDS.user, role: "OWNER", isActive: true },
  });

  // Vende bem e está acabando.
  await db.product.create({
    data: {
      id: IDS.girando,
      companyId: IDS.company,
      name: "Pomada modeladora",
      sku: "PM-01",
      salePrice: "40.00",
      costPrice: "18.00",
      stockQuantity: 2,
      minStockThreshold: 3,
    },
  });

  // Estoque zerado, mas nunca vendeu nada.
  await db.product.create({
    data: {
      id: IDS.parado,
      companyId: IDS.company,
      name: "Loção encalhada",
      salePrice: "30.00",
      costPrice: "12.00",
      stockQuantity: 0,
      minStockThreshold: 5,
    },
  });

  await db.posSale.create({
    data: {
      id: IDS.sale,
      companyId: IDS.company,
      subtotal: "1200.00",
      total: "1200.00",
      paymentMethod: "CASH",
      status: "COMPLETED",
      items: {
        create: [
          {
            type: "PRODUCT",
            productId: IDS.girando,
            name: "Pomada modeladora",
            quantity: 30,
            unitPrice: "40.00",
            totalPrice: "1200.00",
          },
        ],
      },
    },
  });
}

d("consulta de reposição (integração)", () => {
  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
    await cleanup();
    await seed();
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  it("a SQL executa e traz os dois produtos", async () => {
    // Metade do valor está aqui: a consulta cita colunas em camelCase à mão.
    const { getRestockList } = await import("@/server/queries/restock");
    const { items } = await getRestockList(IDS.company);
    expect(items).toHaveLength(2);
  });

  it("produto sem nenhuma venda continua na lista, como parado", async () => {
    // Um JOIN comum no lugar do LEFT o eliminaria — e o produto zerado que
    // ninguém compra sumiria em vez de ser classificado.
    const { getRestockList } = await import("@/server/queries/restock");
    const { items } = await getRestockList(IDS.company);

    const parado = items.find((i) => i.productId === IDS.parado);
    expect(parado).toBeDefined();
    expect(parado!.unitsSold).toBe(0);
    expect(parado!.status).toBe("STALE");
    expect(parado!.suggestedOrder).toBe(0);
  });

  it("produto que gira entra como crítico com quantidade a comprar", async () => {
    const { getRestockList } = await import("@/server/queries/restock");
    const { items } = await getRestockList(IDS.company);

    const girando = items.find((i) => i.productId === IDS.girando)!;
    expect(girando.unitsSold).toBe(30);
    expect(girando.status).toBe("CRITICAL");
    expect(girando.suggestedOrder).toBeGreaterThan(0);
    expect(girando.estimatedCost).toBeCloseTo(girando.suggestedOrder * 18, 2);
  });

  it("venda estornada não conta como giro", async () => {
    // O produto voltou para a prateleira; contá-lo pediria reposição do que
    // não saiu.
    const { getRestockList } = await import("@/server/queries/restock");

    await db.posSale.update({ where: { id: IDS.sale }, data: { status: "REFUNDED" } });
    const { items } = await getRestockList(IDS.company);
    const girando = items.find((i) => i.productId === IDS.girando)!;
    expect(girando.unitsSold).toBe(0);
    expect(girando.status).toBe("STALE");

    await db.posSale.update({ where: { id: IDS.sale }, data: { status: "COMPLETED" } });
  });

  it("venda fora da janela não conta", async () => {
    const { getRestockList } = await import("@/server/queries/restock");
    // Janela de 1 dia: a venda semeada é de agora, então ainda conta.
    const dentro = await getRestockList(IDS.company, 1);
    expect(dentro.items.find((i) => i.productId === IDS.girando)!.unitsSold).toBe(30);

    await db.posSale.update({
      where: { id: IDS.sale },
      data: { createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000) },
    });

    const fora = await getRestockList(IDS.company, 60);
    expect(fora.items.find((i) => i.productId === IDS.girando)!.unitsSold).toBe(0);
  });
});
