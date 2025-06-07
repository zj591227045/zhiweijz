import BookEditClient from './book-edit-client';

interface EditBookPageProps {
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

// 静态导出配置
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function EditBookPage({ params }: EditBookPageProps) {
  return <BookEditClient params={params} />;
}
