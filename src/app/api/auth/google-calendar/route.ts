import { NextRequest, NextResponse } from "next/server";
import { getActiveSession } from "@/lib/session";
import { getAuthUrl } from "@/lib/google-calendar";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = getAuthUrl(session.user.id);
  return NextResponse.redirect(url);
}
