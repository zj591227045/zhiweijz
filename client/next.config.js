/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // 关闭严格模式，减少重复渲染
  experimental: {
    // 启用优化CSS选项
    optimizeCss: true,
    // 启用内存缓存
    memoryBasedWorkersCount: true,
  },
  // 配置图片优化
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
  },
  // 配置压缩
  compress: true,
  // 配置缓存
  onDemandEntries: {
    // 页面在内存中保持活跃的时间
    maxInactiveAge: 60 * 1000,
    // 同时保持活跃的页面数量
    pagesBufferLength: 5,
  },

  // 配置输出
  output: 'standalone',

  // 配置API代理
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*', // 代理到后端服务器
      },
    ];
  },
};

module.exports = nextConfig;
