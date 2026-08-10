import { NextResponse } from "next/server";

// Azure's free tier unloads the API after ~20 min idle; the first request
// while it boots back up either fails to connect or gets a bare 503 from
// the front door. Answer with a problem-details body the forms can show.
export function serviceUnavailable() {
  return NextResponse.json(
    {
      title: "ServiceUnavailable",
      detail: "The server is waking up. Please try again in a moment.",
    },
    { status: 503 },
  );
}
