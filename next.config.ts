import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // 外部图片域名
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'unpkg.com',
      },
    ],
  },
  // Turbopack root 修正
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
