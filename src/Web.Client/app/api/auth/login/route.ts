import { NextRequest, NextResponse } from "next/server";
import { serviceUnavailable } from "../serviceUnavailable";

const API_URL = process.env.API_URL;
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

export async function POST(request: NextRequest) {
  const body = await request.json();

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return serviceUnavailable();
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 503 && data === null) {
      return serviceUnavailable();
    }
    return NextResponse.json(data ?? {}, { status: res.status });
  }

  const { accessToken, refreshToken, accessTokenExpiresAt } = data;

  // The refresh token never reaches browser JS - it lives in this cookie only.
  const response = NextResponse.json({ accessToken, accessTokenExpiresAt });
  response.cookies.set("refresh_token", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
