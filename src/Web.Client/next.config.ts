import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";
import packageJson from "./package.json";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Defaults to true, which reloads the page on every reconnect — that
  // races paused mutations' own resume-on-'online' listener and can abort
  // a queued PUT/DELETE mid-flight before it reaches the server.
  reloadOnOnline: false,
});

const nextConfig: NextConfig = {
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
