import { NextRequest, NextResponse } from "next/server";
import { REFRESH_TOKEN_COOKIE, clearSessionCookies } from "@/lib/auth/cookies";
import { clientIpHeaders } from "@/lib/auth/clientIp";

const API_URL = process.env.API_URL;

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  // End every session on the server, so a refresh token that is still usable
  // elsewhere cannot keep this login alive. The cookies are cleared either way.
  if (refreshToken) {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...clientIpHeaders(request) },
        body: JSON.stringify({ refreshToken }),
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        console.warn(`logout: API answered ${res.status}; server session may still be active`);
      }
    } catch (error) {
      // The API is unreachable or stalled. This browser still forgets its session.
      console.warn("logout: API call failed; server session may still be active", error);
    }
  }

  const response = new NextResponse(null, { status: 204 });
  clearSessionCookies(response.cookies);
  return response;
}
