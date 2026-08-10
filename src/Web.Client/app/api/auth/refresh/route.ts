import { NextRequest, NextResponse } from "next/server";
import { serviceUnavailable } from "../serviceUnavailable";

const API_URL = process.env.API_URL;
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ title: "No session" }, { status: 401 });
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return serviceUnavailable();
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 503 && data === null) {
      return serviceUnavailable();
    }
    const response = NextResponse.json(data ?? {}, { status: res.status });

    // Only a real 401 ends the session; transient failures keep the cookie.
    if (res.status === 401) {
      response.cookies.set("refresh_token", "", { path: "/", maxAge: 0 });
    }

    return response;
  }

  const response = NextResponse.json({
    accessToken: data.accessToken,
    accessTokenExpiresAt: data.accessTokenExpiresAt,
  });
  response.cookies.set("refresh_token", data.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
