"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/page-container";
import { AIServiceForm } from "@/components/ai-services/ai-service-form";
import { aiService, LLMSetting } from "@/lib/api/ai-service";
import "../../styles.css";
import { z } from "zod";

// 表单验证模式
const formSchema = z.object({
  name: z.string().min(1, "名称不能为空"),
  provider: z.string().min(1, "请选择服务提供商"),
  model: z.string().min(1, "模型名称不能为空"),
  apiKey: z.string().min(1, "API密钥不能为空"),
  baseUrl: z.string().optional(),
  temperature: z.number().min(0).max(1).default(0.7),
  maxTokens: z.number().min(100).max(10000).default(1000),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditAIServicePageProps {
  params: {
    id: string;
  };
}

export default function EditAIServicePage({ params }: EditAIServicePageProps) {
  const router = useRouter();
  const [service, setService] = useState<LLMSetting | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 加载AI服务详情
  useEffect(() => {
    const fetchService = async () => {
      setIsLoading(true);
      try {
        // 获取所有服务列表
        const services = await aiService.getLLMSettingsList();
        console.log("获取到的服务列表:", services);

        // 查找当前编辑的服务
        const currentService = Array.isArray(services) ?
          services.find(s => s.id === params.id) : null;

        if (currentService) {
          console.log("找到当前编辑的服务:", currentService);
          setService(currentService);
        } else {
          console.error("未找到ID为", params.id, "的服务");
          toast.error("未找到AI服务");
          router.push("/settings/ai-services");
        }
      } catch (error) {
        console.error("获取AI服务详情失败:", error);
        toast.error("获取AI服务详情失败");
        router.push("/settings/ai-services");
      } finally {
        setIsLoading(false);
      }
    };

    fetchService();
  }, [params.id, router]);

  // 处理表单提交
  const handleSubmit = async (data: FormValues) => {
    try {
      await aiService.updateLLMSettings(params.id, data);
      toast.success("AI服务更新成功");
      router.push("/settings/ai-services");
    } catch (error) {
      console.error("更新AI服务失败:", error);
      toast.error("更新AI服务失败");
    }
  };

  // 处理取消
  const handleCancel = () => {
    router.push("/settings/ai-services");
  };

  if (isLoading) {
    return (
      <PageContainer
        title="编辑AI服务"
        showBackButton={true}
        activeNavItem="profile"
      >
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      </PageContainer>
    );
  }

  if (!service) {
    return null;
  }

  return (
    <PageContainer
      title="编辑AI服务"
      showBackButton={true}
      activeNavItem="profile"
    >
      <div className="page-description">
        编辑AI服务提供商配置，用于智能记账和其他AI功能。
      </div>

      <AIServiceForm
        initialData={service}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </PageContainer>
  );
}
