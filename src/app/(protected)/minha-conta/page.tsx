import { redirect } from "next/navigation";
import { getActiveSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getCrossCompanyBookings } from "@/server/queries/bookings";
import { MinhaContaClient } from "./minha-conta-client";

export const metadata = {
  title: "Minha conta",
};

/**
 * Modo pessoal: os dados e os agendamentos do usuário, em todas as empresas.
 *
 * Contraparte do modo empresa (`/[companySlug]/…`). O Paulinho é dono da
 * própria barbearia e cliente da oficina do Seu Zé — dois papéis, uma conta.
 */
export default async function MinhaContaPage() {
  const session = await getActiveSession();
  if (!session) redirect("/login");

  const [profile, bookings, memberships] = await Promise.all([
    db.userProfile.findUnique({ where: { userId: session.user.id } }),
    getCrossCompanyBookings({
      userId: session.user.id,
      email: session.user.email,
      emailVerified: session.user.emailVerified,
    }),
    // Empresas que a pessoa administra — para o alternador de papel.
    db.companyUser.findMany({
      where: { userId: session.user.id, isActive: true },
      select: { role: true, company: { select: { name: true, slug: true } } },
      orderBy: { company: { name: "asc" } },
    }),
  ]);

  return (
    <MinhaContaClient
      email={session.user.email}
      emailVerified={session.user.emailVerified}
      profile={
        profile
          ? {
              firstName: profile.firstName ?? "",
              lastName: profile.lastName ?? "",
              phone: profile.phone ?? "",
              address: profile.address ?? "",
              aptNo: profile.aptNo ?? "",
              city: profile.city ?? "",
              zip: profile.zip ?? "",
            }
          : null
      }
      bookings={bookings}
      companies={memberships.map((m) => ({
        name: m.company.name,
        slug: m.company.slug,
        role: m.role,
      }))}
    />
  );
}
