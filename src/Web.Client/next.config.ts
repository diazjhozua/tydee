import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stray lockfiles higher up (e.g. in the user profile) otherwise make
  // Turbopack pick the wrong workspace root and break dev routing.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
