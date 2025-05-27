"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { AIServiceForm, AIServiceFormValues } from "@/components/ai-services/ai-service-form";
import { useAIServicesStore } from "@/store/ai-services-store";
import { toast } from "sonner";

export default function AddAIServicePage() {
  const router = useRouter();
  const { createService, isLoading } = useAIServicesStore();

  // 处理表单提交
  const handleSubmit = async (data: AIServiceFormValues) => {
    const success = await createService(data);
    if (success) {
      router.push('/settings/ai-services');
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
        isSubmitting={isLoading}
      />
    </PageContainer>
  );
}
