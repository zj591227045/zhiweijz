import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import EditCategoryForm from '@/components/categories/edit-category-form';

interface CategoryEditPageProps {
  id: string;
}

export default function CategoryEditPage({ id }: CategoryEditPageProps) {
  const router = useRouter();
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 检测是否在 Capacitor 环境中
    const checkCapacitor = () => {
      if (typeof window !== 'undefined') {
        const isCapacitorEnv = !!(window as any).Capacitor;
        setIsCapacitor(isCapacitorEnv);
        setIsLoading(false);
        
        if (!isCapacitorEnv) {
          // 如果不是 Capacitor 环境，重定向到 App Router 版本
          router.replace(`/settings/categories/${id}/edit`);
        }
      }
    };

    checkCapacitor();
  }, [id, router]);

  // 加载中状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 只在 Capacitor 环境中渲染
  if (!isCapacitor) {
    return null;
  }

  return (
    <PageContainer
      title="编辑分类"
      showBack
      backUrl="/settings/categories"
    >
      <EditCategoryForm categoryId={id} />
    </PageContainer>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params!;
  
  return {
    props: {
      id: id as string,
    },
  };
};
