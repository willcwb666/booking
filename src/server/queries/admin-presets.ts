import "server-only";
import { ensureDefaultPresetsSeeded } from "@/lib/seed-presets";
import {
  findManySystemPresets,
  findActiveSystemPresets,
} from "@/lib/system-preset-db";

export async function getAdminPresets(businessType?: string) {
  // Garante que o banco esteja pré-populado com os templates base se estiver vazio
  await ensureDefaultPresetsSeeded();
  return findManySystemPresets(businessType);
}

export async function getActivePresetsByBusinessType(businessType: string) {
  await ensureDefaultPresetsSeeded();
  return findActiveSystemPresets(businessType);
}
