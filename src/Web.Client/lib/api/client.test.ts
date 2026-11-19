import { afterEach, describe, expect, it, vi } from "vitest";

// Stubs go in before the modules load, so the auth module's logout channel is the stand-in, not a real one.
// Each test loads the modules after stubbing, rather than importing them at the top of the file.
async function loadModules() {
  const auth = await import("@/lib/api/auth");
  const client = await import("@/lib/api/client");
  return { auth, client };
}

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("redirectToLoginUnlessSigningOut", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("redirects to /login when no logout is in flight", async () => {
    vi.stubGlobal("BroadcastChannel", class {
      addEventListener() {}
      postMessage() {}
    });
    const { client } = await loadModules();
    const navigate = vi.fn();

    client.redirectToLoginUnlessSigningOut(navigate);

    expect(navigate).toHaveBeenCalledWith("/login");
  }, 20_000);

  it("does not redirect while a logout is in flight, and redirects once it has settled", async () => {
    vi.stubGlobal("BroadcastChannel", class {
      addEventListener() {}
      postMessage() {}
    });
    const pending: ((res: Response) => void)[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>((resolve) => pending.push(resolve))),
    );
    const { auth, client } = await loadModules();
    const navigate = vi.fn();

    const loggingOut = auth.logout();
    await settle();
    client.redirectToLoginUnlessSigningOut(navigate);
    expect(navigate).not.toHaveBeenCalled();

    // The server answers the revoke. The second request queues behind it, so the guard stays up until that settles too.
    pending.splice(0).forEach((answer) => answer(new Response(null, { status: 204 })));
    await loggingOut;
    await settle();
    client.redirectToLoginUnlessSigningOut(navigate);
    expect(navigate).not.toHaveBeenCalled();

    pending.splice(0).forEach((answer) => answer(new Response(null, { status: 204 })));
    await settle();

    client.redirectToLoginUnlessSigningOut(navigate);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/login");
  }, 20_000);

  it("redirects once a logout has failed, so a failed sign-out does not hold the guard up", async () => {
    vi.stubGlobal("BroadcastChannel", class {
      addEventListener() {}
      postMessage() {}
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 503 })));
    const { auth, client } = await loadModules();
    const navigate = vi.fn();

    await expect(auth.logout()).rejects.toMatchObject({ status: 503 });
    client.redirectToLoginUnlessSigningOut(navigate);
    expect(navigate).toHaveBeenCalledWith("/login");
  }, 20_000);
});
