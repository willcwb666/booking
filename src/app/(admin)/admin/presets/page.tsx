import { getAdminPresets } from "@/server/queries/admin-presets";
import { PresetsClient } from "./presets-client";

export default async function AdminPresetsPage() {
  const presets = await getAdminPresets();

  return <PresetsClient initialPresets={presets} />;
}
