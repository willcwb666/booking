import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  const companies = await db.company.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      businessType: true,
      createdAt: true,
      _count: {
        select: { bookings: true, customers: true, professionals: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });
  console.log("Total de empresas no banco:", companies.length);
  console.table(companies.map(c => ({
    Nome: c.name,
    Slug: c.slug,
    Tipo: c.businessType,
    Agendamentos: c._count.bookings,
    Clientes: c._count.customers,
    CriadaEm: c.createdAt.toISOString()
  })));
  await db.$disconnect();
}

main();
