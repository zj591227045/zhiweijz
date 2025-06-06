interface EditBudgetPageProps {
  params: {
    id: string;
  };
}

// Next.js 14 静态导出必需函数
export async function generateStaticParams() {
  // 在静态导出模式下，返回占位符参数以满足Next.js 14的要求
  if (process.env.NEXT_BUILD_MODE === 'export') {
    return [{ id: 'placeholder' }];
  }
  // 开发环境返回空数组，允许动态路由
  return [];
}

export default function EditBudgetPage({ params }: EditBudgetPageProps) {
  // 临时占位符实现 - 后续可扩展为完整功能
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">编辑预算</h1>
      <p className="text-muted-foreground">预算ID: {params.id}</p>
      <p className="mt-4">此页面功能正在开发中...</p>
    </div>
  );
}
