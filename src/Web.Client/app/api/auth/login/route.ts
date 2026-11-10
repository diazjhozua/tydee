import { NextRequest, NextResponse } from "next/server";
import { applySessionCookies } from "@/lib/auth/cookies";

export const maxDuration = 60;

const API_URL = process.env.API_URL;

export async function POST(request: NextRequest) {
  const { email, password, rememberMe } = await request.json();

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return NextResponse.json({}, { status: 503 });
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return NextResponse.json(data ?? {}, { status: res.status });
  }

  const { accessToken, refreshToken, accessTokenExpiresAt } = data;

  // The refresh token never reaches browser JS - it lives in this cookie only.
  const response = NextResponse.json({ accessToken, accessTokenExpiresAt });
  applySessionCookies(response.cookies, refreshToken, rememberMe === true);

  return response;
}
