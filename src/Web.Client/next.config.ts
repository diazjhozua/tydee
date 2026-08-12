import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";
import packageJson from "./package.json";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
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
