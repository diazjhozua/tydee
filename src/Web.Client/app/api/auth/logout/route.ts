import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/auth/cookies";

export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  clearSessionCookies(response.cookies);
  return response;
}
