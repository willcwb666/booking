import { googleAuthEnabled } from "@/lib/auth";
import LoginClient from "./login-client";

// Só aceita caminhos relativos internos — evita open redirect
function safeCallbackUrl(url: string | undefined): string | null {
  if (url && url.startsWith("/") && !url.startsWith("//")) return url;
  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  return <LoginClient googleEnabled={googleAuthEnabled} callbackUrl={safeCallbackUrl(callbackUrl)} />;
}
