/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@zhiweijz/core', '@zhiweijz/web'],

  // Docker构建配置
  output: 'standalone',

  // 实验性功能
  experimental: {
    optimizeFonts: true,
  },

  // 图片优化配置
  images: {
    domains: ['localhost'],
    unoptimized: process.env.NODE_ENV === 'production', // 在生产环境中禁用图片优化以减少构建时间
  },

  // 压缩配置
  compress: true,

  // 构建时忽略错误（根据需要调整）
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  async rewrites() {
    // 智能检测后端服务器地址
    const getBackendUrl = () => {
      // 1. 优先使用环境变量
      if (process.env.BACKEND_URL) {
        return process.env.BACKEND_URL;
      }

      // 2. 检测是否在Docker环境中
      const isDocker = process.env.DOCKER_ENV === 'true' ||
                      process.env.NODE_ENV === 'production';

      // 3. 根据环境选择后端地址
      if (isDocker) {
        // Docker环境：使用容器名称
        return 'http://backend:3000';
      } else {
        // 开发环境：使用本地地址
        return process.env.DEV_BACKEND_URL || 'http://localhost:3000';
      }
    };

    const backendUrl = getBackendUrl();
    console.log(`[Next.js] 后端代理地址: ${backendUrl}`);

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
