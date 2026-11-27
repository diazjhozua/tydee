import { NextRequest, NextResponse } from "next/server";
import { applySessionCookies } from "@/lib/auth/cookies";
import { clientIpHeaders } from "@/lib/auth/clientIp";
import { guardBffRequest } from "@/lib/auth/requestGuard";

export const maxDuration = 60;

const API_URL = process.env.API_URL;

export async function POST(request: NextRequest) {
  const refused = guardBffRequest(request, { requireJson: true });
  if (refused) {
    return refused;
  }

  const { email, password, rememberMe } = await request.json();

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...clientIpHeaders(request) },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return NextResponse.json({}, { status: 503 });
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const failure = NextResponse.json(data ?? {}, { status: res.status });
    const retryAfter = res.headers.get("Retry-After");

    if (retryAfter) {
      failure.headers.set("Retry-After", retryAfter);
    }

    return failure;
  }

  const { accessToken, refreshToken, accessTokenExpiresAt } = data;

  // The refresh token never reaches browser JS - it lives in this cookie only.
  const response = NextResponse.json({ accessToken, accessTokenExpiresAt });
  applySessionCookies(response.cookies, refreshToken, rememberMe === true);

  return response;
}
