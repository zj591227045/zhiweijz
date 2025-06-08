import BookEditClient from './book-edit-client';

interface EditBookPageProps {
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

// 静态导出配置 - 移除force-dynamic以兼容静态导出
// export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function EditBookPage({ params }: EditBookPageProps) {
  return <BookEditClient params={params} />;
}
