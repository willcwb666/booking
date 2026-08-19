import { redirect } from "next/navigation";
import { getActiveSession, getSessionTimeoutConfig } from "@/lib/session";
import { GuidedTour } from "@/components/ui/guided-tour";
import { SessionTimeoutGuard } from "@/components/ui/session-timeout-guard";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getActiveSession();

  if (!session) {
    redirect("/login");
  }

  const { idleSeconds } = await getSessionTimeoutConfig(session);

  return (
    <>
      <SessionTimeoutGuard idleSeconds={idleSeconds} />
      <GuidedTour />
      {children}
    </>
  );
}
