"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/page-container";
import { AIServiceForm } from "@/components/ai-services/ai-service-form";
import { aiService } from "@/lib/api/ai-service";
import "../styles.css";
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

export default function AddAIServicePage() {
  const router = useRouter();

  // 处理表单提交
  const handleSubmit = async (data: FormValues) => {
    try {
      // 创建AI服务
      const result = await aiService.createLLMSettings(data);

      if (result && result.success && result.id) {
        toast.success("AI服务创建成功");

        // 这里可以添加账本绑定逻辑
        // 由于账本绑定在表单组件中已经处理，这里不需要额外处理

        router.push("/settings/ai-services");
      } else {
        toast.error("创建AI服务失败");
      }
    } catch (error) {
      console.error("创建AI服务失败:", error);
      toast.error("创建AI服务失败");
    }
  };

  // 处理取消
  const handleCancel = () => {
    router.push("/settings/ai-services");
  };

  return (
    <PageContainer
      title="添加AI服务"
      showBackButton={true}
      activeNavItem="profile"
    >
      <div className="page-description">
        配置新的AI服务提供商，用于智能记账和其他AI功能。
      </div>

      <AIServiceForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </PageContainer>
  );
}
