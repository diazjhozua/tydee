import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";
import packageJson from "./package.json";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // A dev-mode service worker caches stale chunks across restarts, which
  // surfaces as "module factory is not available" after an edit.
  disable: process.env.NODE_ENV === "development",
  // Defaults to true, which reloads the page on every reconnect — that
  // races paused mutations' own resume-on-'online' listener and can abort
  // a queued PUT/DELETE mid-flight before it reaches the server.
  reloadOnOnline: false,
});

const nextConfig: NextConfig = {
  // Keep Turbopack dev artifacts out of the production `.next` directory.
  // `next build --webpack` and `next dev` write incompatible manifests; sharing
  // one directory leaves stale route manifests and 404s every app route until
  // `.next` is deleted.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  // Stray lockfiles higher up (e.g. in the user profile) otherwise make
  // Turbopack pick the wrong workspace root and break dev routing.
  turbopack: {
    root: process.cwd(),
  },
};

export default withSerwist(nextConfig);
