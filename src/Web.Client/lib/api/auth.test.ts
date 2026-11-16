import { afterEach, describe, expect, it, vi } from "vitest";
import { refreshAccessToken, settleRefresh } from "@/lib/api/auth";

describe("settleRefresh", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("resolves at once when no refresh is in flight", async () => {
    await expect(settleRefresh()).resolves.toBeUndefined();
  });

  it("waits for a refresh that is still in flight", async () => {
    let finish!: (res: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>((resolve) => (finish = resolve))),
    );

    const refreshing = refreshAccessToken();
    let settled = false;
    const settle = settleRefresh().then(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(false);

    finish(new Response(null, { status: 401 }));
    await settle;
    expect(settled).toBe(true);
    await refreshing;
  });

  it("stops waiting after three seconds when a refresh stalls", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );

    void refreshAccessToken();
    const settle = settleRefresh();

    await vi.advanceTimersByTimeAsync(3000);
    await expect(settle).resolves.toBeUndefined();
  });
});
