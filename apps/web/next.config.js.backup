/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // 只在生产环境启用静态导出配置
  ...(process.env.NODE_ENV === 'production' && {
    output: 'export',
    distDir: 'out',
    trailingSlash: true,
  }),
  
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
  
  // 忽略构建错误
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 移除headers配置，因为静态导出不支持
};

module.exports = nextConfig; 