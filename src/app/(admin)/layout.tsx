import { redirect } from "next/navigation";
import { getActiveSession, getSessionTimeoutConfig } from "@/lib/session";
import { AdminSidebar } from "@/components/ui/admin-sidebar";
import { AdminHeader } from "@/components/ui/admin-header";
import { SessionTimeoutGuard } from "@/components/ui/session-timeout-guard";
import { getCompaniesForSelector } from "@/server/queries/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getActiveSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const [companies, { idleSeconds }] = await Promise.all([
    getCompaniesForSelector(),
    getSessionTimeoutConfig(session),
  ]);

  return (
    <div className="app-shell">
      <SessionTimeoutGuard idleSeconds={idleSeconds} />
      <AdminSidebar userName={session.user.name} companies={companies} />
      <div className="app-main">
        <AdminHeader companies={companies} />
        <main className="page-container">
          {children}
        </main>
      </div>
    </div>
  );
}
