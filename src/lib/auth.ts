import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

// Login com Google só é habilitado quando as credenciais estão no ambiente —
// as telas de login/registro escondem o botão quando isso está desligado
export const googleAuthEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
  session: {
    // 7 dias: o app mobile lê a sessão direto do banco sem refresh, então
    // encurtar isso força re-login frequente no mobile.
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: googleAuthEnabled
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : undefined,
  emailVerification: {
    // Verificação não bloqueia o login, mas é exigida para funcionalidades
    // sensíveis (ex.: ver bookings vinculados ao e-mail no app mobile)
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({
        to: user.email,
        userName: user.name || user.email,
        url,
      });
    },
  },
  plugins: [admin()],
  user: {
    additionalFields: {
      bio: {
        type: "string",
        required: false,
        defaultValue: null,
        input: true,
      },
      location: {
        type: "string",
        required: false,
        defaultValue: null,
        input: true,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
