import FamilyDetailClient from './family-detail-client';

interface FamilyDetailPageProps {
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

export default function FamilyDetailPage({ params }: FamilyDetailPageProps) {
  return <FamilyDetailClient params={params} />;
}
