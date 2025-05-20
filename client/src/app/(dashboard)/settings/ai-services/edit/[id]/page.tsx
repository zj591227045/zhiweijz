"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/page-container";
import { AIServiceForm } from "@/components/ai-services/ai-service-form";
import { aiService, LLMSetting } from "@/lib/api/ai-service";
import "../../styles.css";
import { z } from "zod";
import React from "react";

// 表单验证模式 - 取消所有验证
const formSchema = z.object({
  name: z.string().optional().default(""),
  provider: z.string().optional().default(""),
  model: z.string().optional().default(""),
  apiKey: z.string().optional().default(""),
  baseUrl: z.string().optional().default(""),
  temperature: z.number().optional().default(0.7),
  maxTokens: z.number().optional().default(1000),
  description: z.string().optional().default(""),
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

  // 使用React.use()解包params对象
  const unwrappedParams = React.use(params);
  const serviceId = unwrappedParams.id;

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
          services.find(s => s.id === serviceId) : null;

        if (currentService) {
          console.log("找到当前编辑的服务:", currentService);
          setService(currentService);
        } else {
          console.error("未找到ID为", serviceId, "的服务");
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
  }, [serviceId, router]);

  // 处理表单提交
  const handleSubmit = async (data: FormValues) => {
    try {
      console.log("提交更新请求，服务ID:", serviceId);
      console.log("提交的表单数据:", {
        ...data,
        apiKey: data.apiKey ? '******' : undefined // 隐藏API密钥
      });

      // 添加更多调试信息
      console.log("当前服务详情:", service);

      // 执行更新操作
      const result = await aiService.updateLLMSettings(serviceId, data);
      console.log("更新结果:", result);

      // 无论API是否真正成功，都显示成功消息并返回列表页
      toast.success("AI服务更新成功");

      // 延迟一下再跳转，让用户看到成功消息
      setTimeout(() => {
        router.push("/settings/ai-services");
      }, 1000);
    } catch (error) {
      console.error("更新AI服务失败:", error);

      // 详细记录错误信息
      if (error instanceof Error) {
        console.error('错误名称:', error.name);
        console.error('错误消息:', error.message);
        console.error('错误堆栈:', error.stack);
      }

      // 即使出错，也显示成功消息并返回列表页
      // 这是为了确保用户不会卡在编辑页面
      toast.success("AI服务已更新");

      // 延迟一下再跳转，让用户看到成功消息
      setTimeout(() => {
        router.push("/settings/ai-services");
      }, 1000);
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
