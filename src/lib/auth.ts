import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { db } from "@/lib/db";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";
import { detectSessionClient, enforceSingleWebSession } from "@/lib/session-policy";
import { writeAuditRow } from "@/lib/audit";

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
    // encurtar isso força re-login frequente no mobile. O teto real de uma
    // sessão de painel é o timeout de inatividade (@/lib/session-policy),
    // não este valor.
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    additionalFields: {
      // Origem da sessão — decide qual política de inatividade se aplica e
      // quais sessões a regra de "um login por vez" pode derrubar.
      client: { type: "string", required: false, defaultValue: "WEB", input: false },
      // Último acesso autenticado observado. Mantido por nós, não pelo
      // better-auth (que só toca `updatedAt` a cada `updateAge`).
      lastActivityAt: { type: "date", required: false, input: false },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session, ctx) => {
          const headers = ctx?.headers ?? ctx?.request?.headers ?? null;
          return {
            data: {
              ...session,
              client: detectSessionClient(headers),
              lastActivityAt: new Date(),
            },
          };
        },
        after: async (session) => {
          // Impersonation deixa rastro. O plugin admin permite abrir sessão
          // como QUALQUER usuário — a checagem de papel já existia, o que
          // faltava era registro. Sem isso, uma conta de super admin
          // comprometida percorria todos os tenants sem deixar histórico.
          // `impersonatedBy` vem do plugin admin e chega sem tipo concreto
          // na inferência do better-auth.
          const impersonatedBy = (session as { impersonatedBy?: string | null })
            .impersonatedBy;

          if (impersonatedBy) {
            await writeAuditRow({
              userId: impersonatedBy,
              action: "IMPERSONATION_START",
              entity: "Session",
              details: {
                targetUserId: session.userId,
                sessionId: session.id,
              },
              ipAddress: session.ipAddress ?? null,
            });
            return;
          }

          // "Não pode acessar de duas máquinas com o mesmo login": ao criar
          // uma sessão de navegador, as outras sessões WEB caem. Sessões do
          // app mobile são preservadas de propósito.
          if ((session as { client?: string }).client === "MOBILE") return;
          await enforceSingleWebSession({
            userId: session.userId,
            keepSessionId: session.id,
          });
        },
      },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  emailAndPassword: {
    enabled: true,
    // Sem isto, "Esqueci minha senha" não tinha para onde ir e o dono de um
    // salão que esquecesse a senha ficava trancado fora do próprio sistema —
    // sem nenhuma rota de recuperação além de suporte manual.
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        userName: user.name || user.email,
        url,
      });
    },
    // O link do e-mail vale por 1 hora
    resetPasswordTokenExpiresIn: 3600,
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
