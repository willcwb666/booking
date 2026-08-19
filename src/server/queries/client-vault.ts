import "server-only";
import { db } from "@/lib/db";
import { generatePresignedDownloadUrl } from "@/lib/r2";
import { buildSuggestions, type PhotoKind } from "@/lib/client-vault";

/**
 * Leitura do cofre de um cliente.
 *
 * O `companyId` vem sempre de quem já passou pelo guard de módulo — nunca de
 * parâmetro do navegador. Toda consulta aqui carrega o filtro por empresa junto
 * com o do cliente: sem ele, um id de cliente de outra empresa devolveria as
 * fotos dela, que é a mesma classe de falha fechada em 2026-08-18 e, aqui, com
 * o pior conteúdo possível.
 */

export type VaultPhoto = {
  id: string;
  kind: PhotoKind;
  caption: string | null;
  /** URL assinada, de vida curta. Não guardar, não compartilhar. */
  url: string;
  takenAt: Date;
  professionalName: string | null;
  retainUntil: Date;
};

export type VaultRecord = {
  id: string;
  bookingId: string | null;
  professionalName: string | null;
  formula: string | null;
  developer: string | null;
  processingMinutes: number | null;
  clipperGuard: string | null;
  productsUsed: string | null;
  notes: string | null;
  performedAt: Date;
};

export type VaultSuggestions = {
  formula: string[];
  developer: string[];
  clipperGuard: string[];
  productsUsed: string[];
};

export type ClientVault = {
  photos: VaultPhoto[];
  records: VaultRecord[];
  suggestions: VaultSuggestions;
};

/** Vida do link de leitura. Curta o bastante para não virar URL compartilhável. */
const SIGNED_URL_TTL_SECONDS = 300;

export async function getClientVault(input: {
  companyId: string;
  customerId: string;
  /** Profissional cujas entradas anteriores alimentam o autocomplete. */
  professionalId?: string | null;
}): Promise<ClientVault> {
  const [photos, records, history] = await Promise.all([
    db.clientPhoto.findMany({
      where: { companyId: input.companyId, customerId: input.customerId },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { professional: { select: { name: true } } },
    }),
    db.serviceRecord.findMany({
      where: { companyId: input.companyId, customerId: input.customerId },
      orderBy: { performedAt: "desc" },
      take: 30,
      include: { professional: { select: { name: true } } },
    }),
    /**
     * Histórico que alimenta o autocomplete.
     *
     * Filtra pelo PROFISSIONAL, não pelo cliente: a pergunta que o campo
     * responde é "o que eu costumo usar?", não "o que já foi usado nesta
     * cabeça?" — esta segunda já está na lista de fichas logo acima. Sem
     * profissional definido, cai para o histórico da empresa, que é pior mas
     * melhor que campo vazio.
     */
    db.serviceRecord.findMany({
      where: {
        companyId: input.companyId,
        ...(input.professionalId ? { professionalId: input.professionalId } : {}),
      },
      orderBy: { performedAt: "desc" },
      take: 200,
      select: {
        formula: true,
        developer: true,
        clipperGuard: true,
        productsUsed: true,
      },
    }),
  ]);

  const signed = await Promise.all(
    photos.map(async (p) => ({
      id: p.id,
      kind: p.kind as PhotoKind,
      caption: p.caption,
      url: await generatePresignedDownloadUrl(p.storageKey, SIGNED_URL_TTL_SECONDS),
      takenAt: p.createdAt,
      professionalName: p.professional?.name ?? null,
      retainUntil: p.retainUntil,
    }))
  );

  return {
    photos: signed,
    records: records.map((r) => ({
      id: r.id,
      bookingId: r.bookingId,
      professionalName: r.professional?.name ?? null,
      formula: r.formula,
      developer: r.developer,
      processingMinutes: r.processingMinutes,
      clipperGuard: r.clipperGuard,
      productsUsed: r.productsUsed,
      notes: r.notes,
      performedAt: r.performedAt,
    })),
    suggestions: {
      formula: buildSuggestions(history.map((h) => h.formula)),
      developer: buildSuggestions(history.map((h) => h.developer)),
      clipperGuard: buildSuggestions(history.map((h) => h.clipperGuard)),
      productsUsed: buildSuggestions(history.map((h) => h.productsUsed)),
    },
  };
}
