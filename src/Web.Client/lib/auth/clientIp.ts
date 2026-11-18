import { isIP } from "node:net";

// Cloudflare Tunnel sets this header to the visitor's address and overwrites any value the
// visitor sent. The BFF forwards it to the API so the API rate-limits per visitor instead of
// per server. Forward it only when it is a single IP address.
export const CLIENT_ADDRESS_HEADER = "CF-Connecting-IP";

export function clientIpHeaders(request: Request): Record<string, string> {
  const value = request.headers.get("cf-connecting-ip")?.trim();

  if (!value || isIP(value) === 0) {
    return {};
  }

  return { [CLIENT_ADDRESS_HEADER]: value };
}
