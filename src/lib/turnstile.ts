import "server-only";

export async function verifyTurnstileToken(token: string | null | undefined, ip?: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  // Se a chave não estiver configurada no ambiente (ex: desenvolvimento local), libera automaticamente
  if (!secretKey) return true;
  if (!token) return false;

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (ip) formData.append("remoteip", ip);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.error("[turnstile] Erro ao validar token:", err);
    // Fail-open em caso de falha de rede da API do Cloudflare para não derrubar a aplicação
    return true;
  }
}
