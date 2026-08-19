"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    adminClient(),
    twoFactorClient({
      // Login com 2FA ligado não devolve sessão: devolve a ordem de verificar.
      // Sem este redirecionamento o usuário ficaria na tela de login achando
      // que a senha falhou.
      onTwoFactorRedirect() {
        window.location.href = "/verificacao";
      },
    }),
  ],
});

export const { signIn, signOut, signUp, useSession, getSession, twoFactor } = authClient;
