import VersionUpdateTest from '@/components/debug/VersionUpdateTest';

export default function VersionTestPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          版本更新功能测试页面
        </h1>
        <VersionUpdateTest />
      </div>
    </div>
  );
}
