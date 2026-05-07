import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
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
