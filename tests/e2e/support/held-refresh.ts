import type { APIResponse, BrowserContext, Page } from "@playwright/test";
import { BASE_URL } from "./env";

type Cookie = Parameters<BrowserContext["addCookies"]>[0][number];

// The refresh cookies a BFF response sets, so a test can apply them to the browser at the moment it chooses.
function cookiesFrom(response: APIResponse): Cookie[] {
  return response.headersArray().flatMap((header) => {
    if (header.name.toLowerCase() !== "set-cookie") {
      return [];
    }

    const [pair] = header.value.split(";");
    const separator = pair.indexOf("=");

    return [
      {
        name: pair.slice(0, separator).trim(),
        value: pair.slice(separator + 1).trim(),
        url: BASE_URL,
        httpOnly: true,
        sameSite: "Lax",
      },
    ];
  });
}

/**
 * Holds the next refresh that `page` makes. The BFF rotates the token on the server before the response is held,
 * so the browser keeps the old cookie until `release()` applies the new one. That is what a slow network does.
 * `rotationHeld` resolves once the held response is in hand; `applied` resolves once it has been delivered.
 */
export async function holdNextRefresh(page: Page) {
  const context = page.context();
  const rotation: { status?: number; cookies: Cookie[] } = { cookies: [] };

  let markHeld!: () => void;
  let markApplied!: () => void;
  let unhold!: () => void;
  const rotationHeld = new Promise<void>((resolve) => (markHeld = resolve));
  const applied = new Promise<void>((resolve) => (markApplied = resolve));
  const released = new Promise<void>((resolve) => (unhold = resolve));

  await page.route("**/api/auth/refresh", async (route) => {
    const response = await route.fetch();
    rotation.status = response.status();
    rotation.cookies = cookiesFrom(response);
    markHeld();
    await released;
    await context.addCookies(rotation.cookies);
    await route.fulfill({ response });
    markApplied();
  });

  return { rotationHeld, rotation, applied, release: () => unhold() };
}
