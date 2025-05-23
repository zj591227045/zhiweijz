/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@zhiweijz/core', '@zhiweijz/web'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*', // 代理到后端API服务
      },
    ];
  },
};

module.exports = nextConfig;
