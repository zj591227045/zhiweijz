/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // 根据环境选择配置
  ...(process.env.NODE_ENV === 'development' ? {
    // 开发环境配置
    experimental: {
      missingSuspenseWithCSRBailout: false,
    },
    
    // API代理配置
    async rewrites() {
      const backendUrl = process.env.DEV_BACKEND_URL || 'http://localhost:3000';
      console.log('🔧 开发环境API代理配置:', backendUrl);
      
      return [
        {
          source: '/api/:path*',
          destination: `${backendUrl}/api/:path*`,
        },
      ];
    },
  } : {
    // 生产环境配置 - Capacitor静态导出
    output: 'export',
    distDir: 'out',
    trailingSlash: true,
    
    // 图片优化配置
    images: {
      unoptimized: true
    },
    
    // 禁用服务端功能
    experimental: {
      missingSuspenseWithCSRBailout: false,
    },
    
    // 构建配置
    generateBuildId: () => 'capacitor-build',
  }),
  
  // 环境变量
  env: {
    IS_MOBILE_BUILD: process.env.IS_MOBILE_BUILD || 'false',
  },
  
  // 忽略构建错误
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig; 