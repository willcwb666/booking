import { googleAuthEnabled } from "@/lib/auth";
import RegisterClient from "./register-client";

// Só aceita caminhos relativos internos — evita open redirect
function safeCallbackUrl(url: string | undefined): string | null {
  if (url && url.startsWith("/") && !url.startsWith("//")) return url;
  return null;
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  return <RegisterClient googleEnabled={googleAuthEnabled} callbackUrl={safeCallbackUrl(callbackUrl)} />;
}
