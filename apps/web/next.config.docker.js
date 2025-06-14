/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Docker环境使用standalone模式
  output: 'standalone',
  
  // 图片优化配置
  images: {
    unoptimized: true
  },
  
  // 实验性功能
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  
  // 忽略构建错误
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 环境变量
  env: {
    DOCKER_ENV: process.env.DOCKER_ENV || 'true',
  },
  
  // Webpack配置 - 处理内部包路径和依赖
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@zhiweijz/core': require('path').resolve(__dirname, '../packages/core/src'),
      '@zhiweijz/web': require('path').resolve(__dirname, '../packages/web/src'),
    };
    
    // 确保内部包可以访问前端的依赖
    config.resolve.modules = [
      require('path').resolve(__dirname, 'node_modules'),
      require('path').resolve(__dirname, '../node_modules'),
      'node_modules'
    ];
    
    return config;
  },
};

module.exports = nextConfig; 