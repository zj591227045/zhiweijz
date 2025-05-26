/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // 关闭严格模式，减少重复渲染
  eslint: {
    // 在构建时忽略ESLint错误
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 在构建时忽略TypeScript错误
    ignoreBuildErrors: true,
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



  // 配置API代理
  async rewrites() {
    // 获取后端服务器地址，默认使用本机IP
    const backendUrl = process.env.BACKEND_URL || 'http://10.255.0.27:3000';
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`, // 代理到后端服务器
      },
    ];
  },

  // 配置头信息，解决CORS问题
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
