import { describe, expect, it } from "vitest";
import { CLIENT_ADDRESS_HEADER, clientIpHeaders } from "@/lib/auth/clientIp";

function requestWith(value?: string): Request {
  const headers = new Headers();

  if (value !== undefined) {
    headers.set("cf-connecting-ip", value);
  }

  return new Request("https://tydee.diazjhozua.com/api/auth/login", { headers });
}

describe("clientIpHeaders", () => {
  it("sends nothing when Cloudflare sent no address", () => {
    expect(clientIpHeaders(requestWith())).toEqual({});
  });

  it("forwards an IPv4 address", () => {
    expect(clientIpHeaders(requestWith("203.0.113.7"))).toEqual({
      [CLIENT_ADDRESS_HEADER]: "203.0.113.7",
    });
  });

  it("forwards an IPv6 address", () => {
    expect(clientIpHeaders(requestWith("2001:db8::1"))).toEqual({
      [CLIENT_ADDRESS_HEADER]: "2001:db8::1",
    });
  });

  it("trims surrounding spaces before forwarding", () => {
    expect(clientIpHeaders(requestWith("  203.0.113.7  "))).toEqual({
      [CLIENT_ADDRESS_HEADER]: "203.0.113.7",
    });
  });

  it.each([
    "",
    "   ",
    "not-an-ip",
    "203.0.113.7:443",
    "203.0.113.7, 198.51.100.2",
  ])("drops a value that is not a single IP address: %j", (value) => {
    expect(clientIpHeaders(requestWith(value))).toEqual({});
  });
});
