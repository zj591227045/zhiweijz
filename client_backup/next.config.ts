import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  experimental: {
    optimizeCss: true,
  },
  compiler: {
    // 启用样式内联
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
