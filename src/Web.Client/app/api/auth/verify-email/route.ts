import { NextRequest, NextResponse } from "next/server";
import { serviceUnavailable } from "../serviceUnavailable";

const API_URL = process.env.API_URL;

export async function POST(request: NextRequest) {
  const body = await request.json();

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return serviceUnavailable();
  }

  const data = await res.json().catch(() => null);

  if (res.status === 503 && data === null) {
    return serviceUnavailable();
  }

  return NextResponse.json(data ?? {}, { status: res.status });
}
