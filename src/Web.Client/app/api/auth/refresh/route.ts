import { NextRequest, NextResponse } from "next/server";
import {
  REFRESH_TOKEN_COOKIE,
  applySessionCookies,
  clearSessionCookies,
  hasRememberMe,
} from "@/lib/auth/cookies";

export const maxDuration = 60;

const API_URL = process.env.API_URL;

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    const response = NextResponse.json({ title: "No session" }, { status: 401 });
    clearSessionCookies(response.cookies);
    return response;
  }

  const rememberMe = hasRememberMe(request.cookies);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
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
