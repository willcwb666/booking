import "server-only";
import { ensureDefaultSegmentsSeeded } from "@/lib/seed-segments";
import { findManySystemSegments } from "@/lib/system-segment-db";

export async function getAdminSegments(onlyActive = false) {
  await ensureDefaultSegmentsSeeded();
  return findManySystemSegments(onlyActive);
}
