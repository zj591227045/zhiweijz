/** @type {import('next').NextConfig} */
const path = require('path');

// 检查是否是移动端构建（默认为Web端构建）
const isMobileBuild = process.env.IS_MOBILE_BUILD === 'true';

const nextConfig = {
  reactStrictMode: true,
  
  // 根据构建类型设置不同的配置
  ...(isMobileBuild ? {
    // 移动端配置 - Capacitor静态导出配置
    output: 'export',
    distDir: 'out',
    trailingSlash: true,
    generateBuildId: () => 'mobile-build',
  } : {
    // Web端配置 - 不导出静态文件
    // output: 'standalone', // 如果需要的话
  }),
  
  // 图片优化配置
  images: {
    unoptimized: true
  },
  
  // 禁用服务端功能
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
  
  // 环境变量 - 根据构建类型设置
  env: {
    IS_MOBILE_BUILD: isMobileBuild ? 'true' : 'false',
    NEXT_PUBLIC_IS_MOBILE: isMobileBuild ? 'true' : 'false',
  },



  // 页面扩展名配置
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // 自定义webpack配置
  webpack: (config, { dev, isServer }) => {
    // 检查是否确实是移动端构建
    const isMobileBuildWebpack = process.env.IS_MOBILE_BUILD === 'true';
    
    // 只在移动端构建时排除管理页面相关的文件
    if (isMobileBuildWebpack) {
      // 排除管理页面相关的文件
      config.plugins.push(
        new (require('webpack')).IgnorePlugin({
          resourceRegExp: /^@\/app\/admin/,
          contextRegExp: /src/,
        })
      );

      config.plugins.push(
        new (require('webpack')).IgnorePlugin({
          resourceRegExp: /^@\/components\/admin/,
          contextRegExp: /src/,
        })
      );

      config.plugins.push(
        new (require('webpack')).IgnorePlugin({
          resourceRegExp: /^@\/store\/admin/,
          contextRegExp: /src/,
        })
      );

      // 确保mobile-stub.js文件存在的路径别名
      const stubPath = path.resolve(__dirname, 'src/lib/mobile-stub.js');
      
      // 添加别名，将admin相关导入重定向到空模块
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/app/admin': stubPath,
        '@/components/admin': stubPath,
        '@/store/admin': stubPath,
      };
    } else {
      // Web端构建 - 设置内部包路径别名
      config.resolve.alias = {
        ...config.resolve.alias,
        '@zhiweijz/core': path.resolve(__dirname, '../../packages/core/src'),
        '@zhiweijz/web': path.resolve(__dirname, '../../packages/web/src'),
      };
      
      // 确保内部包可以访问前端的依赖
      config.resolve.modules = [
        path.resolve(__dirname, 'node_modules'),
        path.resolve(__dirname, '../../node_modules'),
        'node_modules'
      ];
    }

    // 定义全局变量
    config.plugins.push(
      new (require('webpack')).DefinePlugin({
        'process.env.IS_MOBILE_BUILD': JSON.stringify(isMobileBuild ? 'true' : 'false'),
        'process.env.NEXT_PUBLIC_IS_MOBILE': JSON.stringify(isMobileBuild ? 'true' : 'false'),
      })
    );

    return config;
  },
};

module.exports = nextConfig;
