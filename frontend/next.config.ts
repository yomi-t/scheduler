import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// 本番は静的書き出し(Cloudflare Pages)。/project/<id> は public/_redirects の
// SPA フォールバックで /project に転送される。
// 開発では output: 'export' を外し、同じ転送を rewrites で再現する
// (export 有効時は rewrites が使えないため、この切り替えが必要)。
const nextConfig: NextConfig = {
  ...(isDev
    ? {
        rewrites: async () => [
          { source: "/project/:id", destination: "/project" },
        ],
      }
    : { output: "export" as const }),
  images: {
    unoptimized: true,
  },
  // ホームディレクトリ等の無関係な lockfile をワークスペースルートと誤認しないように固定
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
