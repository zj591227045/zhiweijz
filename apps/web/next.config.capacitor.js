/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Capacitor静态导出配置
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

  // 忽略构建错误
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 环境变量 - 标识这是移动端构建
  env: {
    IS_MOBILE_BUILD: 'true',
  },

  // 排除管理页面和其他不需要的页面
  async generateStaticParams() {
    return [];
  },

  // 自定义webpack配置，排除管理页面
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 在客户端构建时排除管理页面相关模块
      config.resolve.alias = {
        ...config.resolve.alias,
        // 将admin页面重定向到空模块
        '@/app/admin': false,
      };
    }
    return config;
  },

  // 移除headers配置，因为静态导出不支持
};

module.exports = nextConfig;