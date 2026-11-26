import { NextRequest, NextResponse } from "next/server";
import { clearVerificationCookie, readVerificationSecret } from "@/lib/auth/cookies";
import { clientIpHeaders } from "@/lib/auth/clientIp";
import { guardBffRequest } from "@/lib/auth/requestGuard";

export const maxDuration = 60;

const API_URL = process.env.API_URL;

export async function POST(request: NextRequest) {
  const refused = guardBffRequest(request, { requireJson: true });
  if (refused) {
    return refused;
  }

  const { code } = await request.json();

  // The secret comes from this browser's cookie only, so the page cannot pick a different one.
  const verificationSecret = readVerificationSecret(request.cookies) ?? "";

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...clientIpHeaders(request) },
      body: JSON.stringify({ code, verificationSecret }),
    });
  } catch {
    return NextResponse.json({}, { status: 503 });
  }

  const data = await res.json().catch(() => null);

  // A failure keeps the cookie, so the user can retry the code or resend it from this browser.
  if (!res.ok) {
    return NextResponse.json(data ?? {}, { status: res.status });
  }

  // The code is spent, so the binding goes with it.
  const response = NextResponse.json({ hasPassword: data?.hasPassword });
  clearVerificationCookie(response.cookies);

  return response;
}
