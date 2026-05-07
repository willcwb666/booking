import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const company = await db.company.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      address: true,
      bookingConfigs: {
        where: { status: "PUBLISHED" },
        select: {
          id: true,
          name: true,
          serviceTypes: {
            select: {
              serviceType: {
                select: { name: true, price: true, estimatedMinutes: true },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

  return NextResponse.json(company);
}
