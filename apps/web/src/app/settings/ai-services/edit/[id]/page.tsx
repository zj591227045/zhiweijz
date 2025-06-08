interface EditAIServicePageProps {
  params: {
    id: string;
  };
}

// Next.js 14 静态导出必需函数
export async function generateStaticParams() {
  // 生产环境（静态导出）时返回占位符参数
  if (process.env.NODE_ENV === 'production') {
    return [{ id: 'placeholder' }];
  }
  // 开发环境返回空数组，允许完全动态路由
  return [];
}

export const dynamicParams = true;

export default function EditAIServicePage({ params }: EditAIServicePageProps) {
  // 临时占位符实现 - 后续可扩展为完整功能
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">编辑AI服务</h1>
      <p className="text-muted-foreground">服务ID: {params.id}</p>
      <p className="mt-4">此页面功能正在开发中...</p>
    </div>
  );
}
