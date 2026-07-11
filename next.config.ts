import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGitHubPages ? "/qiqi-ai-product-portfolio" : "",
  assetPrefix: isGitHubPages ? "/qiqi-ai-product-portfolio/" : "",
  trailingSlash: true,
  experimental: {
    viewTransition: true,
  },
  turbopack: {
    root: "/Users/a77",
  },
};

export default nextConfig;
