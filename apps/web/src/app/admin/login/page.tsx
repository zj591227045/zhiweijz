'use client';

import MobileNotSupported from '@/components/admin/MobileNotSupported';

export default function AdminLoginPage() {
  // 如果是移动端构建，直接返回404
  if (process.env.IS_MOBILE_BUILD === 'true') {
    return <MobileNotSupported />;
  }

  // Web端显示简化版本，避免复杂依赖
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">管理员登录</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-center">管理员登录功能仅在Web端完整版本中可用。</p>
          <p className="text-sm text-gray-500 mt-2 text-center">请在电脑浏览器中访问完整的管理后台。</p>
        </div>
      </div>
    </div>
  );
} 