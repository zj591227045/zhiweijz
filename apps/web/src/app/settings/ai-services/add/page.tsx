"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { AIServiceForm, AIServiceFormValues } from "@/components/ai-services/ai-service-form";
import { toast } from "sonner";

export default function AddAIServicePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 处理表单提交
  const handleSubmit = async (data: AIServiceFormValues) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/ai-services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success('AI服务创建成功');
        router.push('/settings/ai-services');
      } else {
        const error = await response.json();
        toast.error(error.message || '创建AI服务失败');
      }
    } catch (error) {
      console.error('创建AI服务失败:', error);
      toast.error('创建AI服务失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理取消
  const handleCancel = () => {
    router.push('/settings/ai-services');
  };

  return (
    <PageContainer
      title="添加AI服务"
      showBackButton={true}
      activeNavItem="profile"
    >
      <AIServiceForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />
    </PageContainer>
  );
}
