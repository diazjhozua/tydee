import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QueryProvider } from "@/providers/QueryProvider";

describe("QueryProvider", () => {
  it("registers the card payment create mutation for offline replay", async () => {
    let client: QueryClient | undefined;

    function Probe() {
      client = useQueryClient();
      return null;
    }

    // The persist provider updates state on mount; flush it inside act.
    await act(async () => {
      render(
        <QueryProvider>
          <Probe />
        </QueryProvider>,
      );
    });

    const defaults = client?.getMutationDefaults(["card-payments", "create"]);
    expect(defaults).toBeDefined();
    expect(defaults?.mutationFn).toBeTypeOf("function");
  });
});
