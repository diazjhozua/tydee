import { NextRequest, NextResponse } from "next/server";
import { applyVerificationCookie } from "@/lib/auth/cookies";
import { clientIpHeaders } from "@/lib/auth/clientIp";
import { guardBffRequest } from "@/lib/auth/requestGuard";

export const maxDuration = 60;

const API_URL = process.env.API_URL;

export async function POST(request: NextRequest) {
  const refused = guardBffRequest(request, { requireJson: true });
  if (refused) {
    return refused;
  }

  const body = await request.json();

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...clientIpHeaders(request) },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({}, { status: 503 });
  }

  const data = await res.json().catch(() => null);

  // The verification secret lets this browser spend the emailed code. It goes into the httpOnly cookie and never
  // reaches the page.
  const { verificationSecret, ...page } = data ?? {};
  const response = NextResponse.json(page, { status: res.status });

  if (res.ok && typeof verificationSecret === "string") {
    applyVerificationCookie(response.cookies, verificationSecret);
  }

  return response;
}
