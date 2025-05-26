/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@zhiweijz/core', '@zhiweijz/web'],
  experimental: {
    optimizeFonts: true,
  },
  async rewrites() {
    // 获取后端服务器地址，默认使用本机IP
    const backendUrl = process.env.BACKEND_URL || 'http://10.255.0.27:3000';
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`, // 代理到后端API服务
      },
    ];
  },
};

module.exports = nextConfig;
