import { NextResponse } from "next/server";

// The BFF auth routes answer POST requests that carry cookies or set them. A cross-site page can send a
// text/plain form, which needs no preflight, and a JSON-shaped body would still parse. Browsers send Sec-Fetch-Site,
// so a cross-site request is refused outright. Routes that parse a body also require application/json, which a form
// cannot send and a cross-origin fetch cannot send without a preflight this API never grants. A missing
// Sec-Fetch-Site (older browsers, non-browser clients) is allowed; the content-type check still covers body routes.

export function guardBffRequest(request: Request, options: { requireJson: boolean }): NextResponse | null {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json(
      { title: "Users.CrossSiteRequest", detail: "Cross-site requests to sign-in are refused." },
      { status: 403 },
    );
  }

  if (options.requireJson && !isJson(request.headers.get("content-type"))) {
    return NextResponse.json(
      { title: "Users.UnsupportedMediaType", detail: "Sign-in requests must be sent as application/json." },
      { status: 415 },
    );
  }

  return null;
}

function isJson(contentType: string | null): boolean {
  return contentType?.split(";")[0].trim().toLowerCase() === "application/json";
}
