"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useMe } from "@/lib/hooks/useMe";
import { defaultPagePath, safeNextPath } from "@/lib/utils/defaultPage";

/**
 * Applies the default-page preference once per app open. The proxy sends `/`
 * to `/app?open=1`; only that marker triggers a redirect, so tapping Home from
 * another screen never bounces the user back.
 */
export function AppOpenRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me, isFetchedAfterMount } = useMe({ refetchOnMount: "always" });
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || pathname !== "/app" || !me || !isFetchedAfterMount) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("open") !== "1") {
      return;
    }

    handled.current = true;
    const next = safeNextPath(params.get("next"));
    router.replace(next ?? defaultPagePath(me.defaultPage));
  }, [isFetchedAfterMount, me, pathname, router]);

  return null;
}
