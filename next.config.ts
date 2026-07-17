import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  env: {
    NEXT_PUBLIC_BASE_PATH: "",
  },
  trailingSlash: true,
  experimental: {
    viewTransition: true,
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
