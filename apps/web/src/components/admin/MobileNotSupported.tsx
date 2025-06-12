export default function MobileNotSupported() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-gray-600 mb-2">管理后台仅在Web端可用</p>
        <p className="text-sm text-gray-500">请在电脑浏览器中访问此功能</p>
      </div>
    </div>
  );
} 