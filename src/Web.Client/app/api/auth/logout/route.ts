import { NextRequest, NextResponse } from "next/server";
import { REFRESH_TOKEN_COOKIE, clearSessionCookies } from "@/lib/auth/cookies";
import { clientIpHeaders } from "@/lib/auth/clientIp";
import { guardBffRequest } from "@/lib/auth/requestGuard";

const API_URL = process.env.API_URL;

// Ends every session of the user on the server. Returns false unless the API confirms it, so the caller can keep
// the cookie: the server session is still live, and the browser must keep its token to retry.
async function revokeSessions(request: NextRequest, refreshToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...clientIpHeaders(request) },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn(`logout: API answered ${res.status}; session kept for retry`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("logout: API call failed; session kept for retry", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const refused = guardBffRequest(request, { requireJson: false });
  if (refused) {
    return refused;
  }

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  // Without a cookie there is no session to revoke, so the browser simply forgets. With one, the cookies go only
  // after the server has ended the session; otherwise the user stays signed in and can retry.
  if (refreshToken && !(await revokeSessions(request, refreshToken))) {
    return NextResponse.json(
      { title: "Users.LogoutFailed", detail: "Sign-out could not be confirmed. Try again." },
      { status: 503 },
    );
  }

  const response = new NextResponse(null, { status: 204 });
  clearSessionCookies(response.cookies);
  return response;
}
