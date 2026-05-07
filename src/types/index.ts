export type { Session } from "@/lib/auth";

export type ApiResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ActionResult<T = unknown> =
  | { success: true; data?: T }
  | { success: false; errors: Record<string, string[]> };
