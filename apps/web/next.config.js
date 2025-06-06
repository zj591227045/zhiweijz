/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 静态导出配置
  output: process.env.NEXT_BUILD_MODE === 'export' ? 'export' : 'standalone',
  
  // 静态导出时的配置
  ...(process.env.NEXT_BUILD_MODE === 'export' && {
    distDir: 'out',
    trailingSlash: true,
    images: {
      unoptimized: true
    },
    experimental: {
      missingSuspenseWithCSRBailout: false,
    },
    // 在静态导出时跳过动态路由
    generateBuildId: () => 'build',
  }),

  // 开启调试日志
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // 实验性功能


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

  // 配置安全头
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' ws: wss: https:; object-src 'none'; base-uri 'self'; form-action 'self';"
          },
        ],
      },
    ];
  },

  async rewrites() {
    // 智能检测后端服务器地址
    const getBackendUrl = () => {
      // 输出环境变量用于调试
      console.log(`[Next.js] 环境变量调试:`);
      console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
      console.log(`  DOCKER_ENV: ${process.env.DOCKER_ENV}`);
      console.log(`  BACKEND_URL: ${process.env.BACKEND_URL}`);
      console.log(`  DEV_BACKEND_URL: ${process.env.DEV_BACKEND_URL}`);

      // 1. 优先使用环境变量
      if (process.env.BACKEND_URL) {
        console.log(`[Next.js] 使用环境变量 BACKEND_URL: ${process.env.BACKEND_URL}`);
        return process.env.BACKEND_URL;
      }

      // 2. 检测是否在Docker环境中
      const isDocker = process.env.DOCKER_ENV === 'true' ||
                      process.env.NODE_ENV === 'production';

      //console.log(`[Next.js] Docker环境检测: ${isDocker}`);

      // 3. 根据环境选择后端地址
      if (isDocker) {
        // Docker环境：使用容器名称
        console.log(`[Next.js] Docker环境，使用容器名称: http://backend:3000`);
        return 'http://backend:3000';
      } else {
        // 开发环境：使用本地地址
        const devUrl = process.env.DEV_BACKEND_URL || 'http://localhost:3000';
        console.log(`[Next.js] 开发环境，使用本地地址: ${devUrl}`);
        return devUrl;
      }
    };

    const backendUrl = getBackendUrl();
    console.log(`[Next.js] 最终后端代理地址: ${backendUrl}`);

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
