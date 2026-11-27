import { NextRequest, NextResponse } from "next/server";
import { applyVerificationCookie, readVerificationSecret } from "@/lib/auth/cookies";
import { clientIpHeaders } from "@/lib/auth/clientIp";
import { guardBffRequest } from "@/lib/auth/requestGuard";

export const maxDuration = 60;

const API_URL = process.env.API_URL;

export async function POST(request: NextRequest) {
  const refused = guardBffRequest(request, { requireJson: true });
  if (refused) {
    return refused;
  }

  const { email } = await request.json();

  // Omitted when this browser holds no secret. JSON.stringify drops the undefined field, so the API sees null.
  const presentedVerificationSecret = readVerificationSecret(request.cookies) || undefined;

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...clientIpHeaders(request) },
      body: JSON.stringify({ email, presentedVerificationSecret }),
    });
  } catch {
    return NextResponse.json({}, { status: 503 });
  }

  const data = await res.json().catch(() => null);

  // The API answers with a fresh secret and rebinds the browser to it. The secret goes into the cookie and never
  // reaches the page.
  const { verificationSecret, ...page } = data ?? {};
  const response = NextResponse.json(page, { status: res.status });

  if (res.ok && typeof verificationSecret === "string") {
    applyVerificationCookie(response.cookies, verificationSecret);
  }

  return response;
}
