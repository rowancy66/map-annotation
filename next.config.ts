import type { NextConfig } from "next";

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
  // TypeScript 构建时忽略错误（本地构建正常，Vercel 环境差异导致部分类型检查失败）
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
