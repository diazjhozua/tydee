import { NextRequest, NextResponse } from "next/server";
import {
  REFRESH_TOKEN_COOKIE,
  applySessionCookies,
  clearSessionCookies,
  hasRememberMe,
} from "@/lib/auth/cookies";
import { clientIpHeaders } from "@/lib/auth/clientIp";
import { guardBffRequest } from "@/lib/auth/requestGuard";

export const maxDuration = 60;

const API_URL = process.env.API_URL;

export async function POST(request: NextRequest) {
  const refused = guardBffRequest(request, { requireJson: false });
  if (refused) {
    return refused;
  }

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    const response = NextResponse.json({ title: "No session" }, { status: 401 });
    clearSessionCookies(response.cookies);
    return response;
  }

  const rememberMe = hasRememberMe(request.cookies);

  let res: Response;
  try {
    // Bounded, so a stalled API cannot hold the cross-tab auth lock indefinitely. A cut refresh may still have
    // rotated the token on the server; the cookie is kept, and the next refresh then reads as reuse.
    res = await fetch(`${API_URL}/api/v1/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...clientIpHeaders(request) },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json({}, { status: 503 });
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const response = NextResponse.json(data ?? {}, { status: res.status });

    // Only a real 401 ends the session; transient failures keep the cookie.
    if (res.status === 401) {
      clearSessionCookies(response.cookies);
    }

    return response;
  }

  const response = NextResponse.json({
    accessToken: data.accessToken,
    accessTokenExpiresAt: data.accessTokenExpiresAt,
  });
  applySessionCookies(response.cookies, data.refreshToken, rememberMe);

  return response;
}
