import type { NextConfig } from "next";

// STATIC_EXPORT=1 builds a static site for GitHub Pages (no server, so no AI reading API).
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = isStatic
  ? {
      output: "export",
      basePath,
      trailingSlash: true,
      env: { NEXT_PUBLIC_STATIC_EXPORT: "1" },
    }
  : {};

export default nextConfig;
