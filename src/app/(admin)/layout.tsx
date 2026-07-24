import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/ui/admin-sidebar";
import { AdminHeader } from "@/components/ui/admin-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="app-shell">
      <AdminSidebar userName={session.user.name} />
      <div className="app-main">
        <AdminHeader />
        <main className="page-container">
          {children}
        </main>
      </div>
    </div>
  );
}
