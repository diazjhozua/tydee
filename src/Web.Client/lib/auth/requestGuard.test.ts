import { describe, expect, it } from "vitest";
import { guardBffRequest } from "./requestGuard";

function request(headers: Record<string, string> = {}) {
  return new Request("https://tydee.diazjhozua.com/api/auth/login", { method: "POST", headers });
}

describe("guardBffRequest", () => {
  it("lets a same-origin JSON request through", () => {
    const refused = guardBffRequest(
      request({ "sec-fetch-site": "same-origin", "content-type": "application/json" }),
      { requireJson: true },
    );

    expect(refused).toBeNull();
  });

  it("accepts application/json with a charset parameter in any letter case", () => {
    const refused = guardBffRequest(request({ "content-type": "Application/JSON; charset=utf-8" }), {
      requireJson: true,
    });

    expect(refused).toBeNull();
  });

  it.each(["text/plain", "application/x-www-form-urlencoded", "multipart/form-data", "application/jsonp"])(
    "refuses a %s body with 415 when JSON is required",
    (contentType) => {
      const refused = guardBffRequest(request({ "content-type": contentType }), { requireJson: true });

      expect(refused?.status).toBe(415);
    },
  );

  it("refuses a body with no content type when JSON is required", () => {
    const refused = guardBffRequest(request(), { requireJson: true });

    expect(refused?.status).toBe(415);
  });

  it("refuses a cross-site request with 403 even when it is JSON", () => {
    const refused = guardBffRequest(
      request({ "sec-fetch-site": "cross-site", "content-type": "application/json" }),
      { requireJson: true },
    );

    expect(refused?.status).toBe(403);
  });

  it("refuses a cross-site request with 403 on a route that takes no body", () => {
    const refused = guardBffRequest(request({ "sec-fetch-site": "cross-site" }), { requireJson: false });

    expect(refused?.status).toBe(403);
  });

  it("does not require a content type on a route that takes no body", () => {
    const refused = guardBffRequest(request(), { requireJson: false });

    expect(refused).toBeNull();
  });

  it("allows a request with no Sec-Fetch-Site header, so older browsers and non-browser clients still work", () => {
    const refused = guardBffRequest(request({ "content-type": "application/json" }), { requireJson: true });

    expect(refused).toBeNull();
  });
});
