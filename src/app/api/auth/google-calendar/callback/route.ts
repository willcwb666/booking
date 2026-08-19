import { NextRequest, NextResponse } from "next/server";
import { getActiveSession } from "@/lib/session";
import { exchangeCode } from "@/lib/google-calendar";
import { db } from "@/lib/db";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // userId

  if (!code || !state) {
    return NextResponse.redirect(new URL("/onboarding?error=google_calendar", request.url));
  }

  const session = await getActiveSession();
  if (!session || session.user.id !== state) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { accessToken, refreshToken, expiresAt } = await exchangeCode(code);

    await db.calendarIntegration.upsert({
      where: { userId_provider: { userId: session.user.id, provider: "GOOGLE" } },
      update: { accessToken, refreshToken, expiresAt, isActive: true },
      create: {
        userId: session.user.id,
        provider: "GOOGLE",
        accessToken,
        refreshToken,
        expiresAt,
      },
    });

    // Redirect back to settings with success
    const member = await db.companyUser.findFirst({
      where: { userId: session.user.id, isActive: true },
      include: { company: { select: { slug: true } } },
    });
    const slug = member?.company.slug ?? "";
    return NextResponse.redirect(new URL(`/${slug}/configuracoes?tab=integrações&gcal=ok`, request.url));
  } catch (err) {
    console.error("[google-calendar callback]", err);
    return NextResponse.redirect(new URL("/onboarding?error=google_calendar", request.url));
  }
}
