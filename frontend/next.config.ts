import type { NextConfig } from "next"

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
})

const nextConfig: NextConfig = withBundleAnalyzer({
  output: "standalone",
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  serverExternalPackages: ["shiki", "vscode-oniguruma"],
  eslint: {
    // @todo: remove before going live
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/v1/assets/**",
      },
    ],
  },
  transpilePackages: [
    "@muse/shared-schemas",
    "tldraw",
    "@tldraw/editor",
    "@tldraw/store",
    "@tldraw/state",
    "@tldraw/state-react",
    "@tldraw/sync",
    "@tldraw/sync-core",
    "@tldraw/tlschema",
    "@tldraw/utils",
    "@tldraw/validate",
  ],
})

export default nextConfig
