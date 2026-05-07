import "server-only";
import { db } from "@/lib/db";

export type TeamMember = {
  id: string; // CompanyUser.id
  userId: string;
  name: string;
  email: string;
  role: "OWNER" | "MANAGER" | "EMPLOYEE";
  isActive: boolean;
  joinedAt: Date;
};

export async function getTeamMembers(companyId: string): Promise<TeamMember[]> {
  const rows = await db.companyUser.findMany({
    where: { companyId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: r.user.name,
    email: r.user.email,
    role: r.role as "OWNER" | "MANAGER" | "EMPLOYEE",
    isActive: r.isActive,
    joinedAt: r.joinedAt,
  }));
}
