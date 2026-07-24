import { getAdminSegments } from "@/server/queries/admin-segments";
import { SegmentsClient } from "./segments-client";

export default async function AdminSegmentsPage() {
  const segments = await getAdminSegments();

  return <SegmentsClient initialSegments={segments} />;
}
