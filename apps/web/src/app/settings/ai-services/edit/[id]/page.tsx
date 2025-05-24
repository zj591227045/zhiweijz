"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { AIServiceForm, AIServiceFormValues } from "@/components/ai-services/ai-service-form";
import { toast } from "sonner";

interface EditAIServicePageProps {
  params: {
    id: string;
  };
}

interface AIService extends AIServiceFormValues {
  id: string;
  createdAt: string;
}

export default function EditAIServicePage({ params }: EditAIServicePageProps) {
  const router = useRouter();
  const { id } = params;
  const [service, setService] = useState<AIService | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 获取AI服务详情
  useEffect(() => {
    const fetchService = async () => {
      try {
        const response = await fetch(`/api/ai-services/${id}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setService(data);
        } else {
          toast.error('获取AI服务详情失败');
          router.push('/settings/ai-services');
        }
      } catch (error) {
        console.error('获取AI服务详情失败:', error);
        toast.error('获取AI服务详情失败');
        router.push('/settings/ai-services');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchService();
    }
  }, [id, router]);

  // 处理表单提交
  const handleSubmit = async (data: AIServiceFormValues) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/ai-services/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success('AI服务更新成功');
        router.push('/settings/ai-services');
      } else {
        const error = await response.json();
        toast.error(error.message || '更新AI服务失败');
      }
    } catch (error) {
      console.error('更新AI服务失败:', error);
      toast.error('更新AI服务失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理取消
  const handleCancel = () => {
    router.push('/settings/ai-services');
  };

  if (isLoading) {
    return (
      <PageContainer
        title="编辑AI服务"
        showBackButton={true}
        activeNavItem="profile"
      >
        <div className="flex h-40 items-center justify-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      </PageContainer>
    );
  }

  if (!service) {
    return (
      <PageContainer
        title="编辑AI服务"
        showBackButton={true}
        activeNavItem="profile"
      >
        <div className="flex h-40 items-center justify-center">
          <p className="text-gray-500">AI服务不存在</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="编辑AI服务"
      showBackButton={true}
      activeNavItem="profile"
    >
      <AIServiceForm
        initialData={service}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />
    </PageContainer>
  );
}
