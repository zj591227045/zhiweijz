"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AccountBook } from "@/types";
import { AIServiceConfig } from "./ai-service-config";
import { AdvancedSettings } from "./advanced-settings";
import { BookPreview } from "./book-preview";

// 表单验证模式
const bookFormSchema = z.object({
  name: z.string().min(1, "账本名称不能为空").max(30, "账本名称不能超过30个字符"),
  description: z.string().max(100, "账本描述不能超过100个字符").optional(),
  isDefault: z.boolean().optional().default(false),
  aiService: z.object({
    enabled: z.boolean().optional().default(false),
    provider: z.string().optional(),
    model: z.string().optional(),
    apiKey: z.string().optional(),
    customPrompt: z.string().optional(),
    language: z.string().optional(),
  }).optional().default({}),
});

export type BookFormValues = z.infer<typeof bookFormSchema>;

interface BookFormProps {
  id?: string;
  book?: AccountBook | null;
  isSubmitting?: boolean;
  onSubmit: (data: BookFormValues) => void;
}

export function BookForm({ id = "book-form", book, isSubmitting = false, onSubmit }: BookFormProps) {
  const [aiEnabled, setAiEnabled] = useState(book?.aiService?.enabled || false);
  const [previewData, setPreviewData] = useState<{
    name: string;
    description: string;
    isDefault: boolean;
    aiEnabled: boolean;
  }>({
    name: book?.name || "个人账本",
    description: book?.description || "日常开支记录",
    isDefault: book?.isDefault || false,
    aiEnabled: false,
  });

  // 表单初始化
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      name: book?.name || "",
      description: book?.description || "",
      isDefault: book?.isDefault || false,
      aiService: {
        enabled: book?.aiService?.enabled || false,
        provider: book?.aiService?.provider || "OpenAI",
        model: book?.aiService?.model || "gpt-4",
        apiKey: book?.aiService?.apiKey || "",
        customPrompt: book?.aiService?.customPrompt || "",
        language: book?.aiService?.language || "zh-CN",
      },
    },
  });

  // 监听表单值变化，更新预览
  const watchedName = watch("name");
  const watchedDescription = watch("description");
  const watchedIsDefault = watch("isDefault");
  const watchedAiEnabled = watch("aiService.enabled");

  // 当表单值变化时更新预览
  useEffect(() => {
    setPreviewData({
      name: watchedName || "账本名称",
      description: watchedDescription || "账本描述",
      isDefault: watchedIsDefault || false,
      aiEnabled: watchedAiEnabled || false,
    });
  }, [watchedName, watchedDescription, watchedIsDefault, watchedAiEnabled]);

  // 处理AI服务启用/禁用
  const handleAiToggle = (enabled: boolean) => {
    setValue("aiService.enabled", enabled);
    setAiEnabled(enabled);
    setPreviewData(prev => ({
      ...prev,
      aiEnabled: enabled,
    }));
  };

  return (
    <form id={id} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 账本基本信息 */}
      <div className="form-group">
        <label className="form-label" htmlFor="book-name">账本名称</label>
        <input
          type="text"
          id="book-name"
          className="form-input"
          placeholder="输入账本名称"
          maxLength={30}
          {...register("name")}
        />
        {errors.name && (
          <div className="form-hint text-red-500">{errors.name.message}</div>
        )}
        {!errors.name && (
          <div className="form-hint">最多30个字符</div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="book-description">账本描述</label>
        <textarea
          id="book-description"
          className="form-textarea"
          placeholder="描述这个账本的用途（可选）"
          maxLength={100}
          {...register("description")}
        ></textarea>
        {errors.description && (
          <div className="form-hint text-red-500">{errors.description.message}</div>
        )}
        {!errors.description && (
          <div className="form-hint">最多100个字符</div>
        )}
      </div>

      <div className="form-group">
        <div className="toggle-container">
          <div className="toggle-label">设为默认账本</div>
          <label className="toggle-switch">
            <input type="checkbox" {...register("isDefault")} />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="form-hint">默认账本将在登录后自动选择</div>
      </div>

      {/* AI服务配置 */}
      <div className="section-title">AI服务配置</div>

      <AIServiceConfig
        register={register}
        setValue={setValue}
        errors={errors}
        enabled={aiEnabled}
        onToggle={handleAiToggle}
      />

      {/* 高级设置 */}
      <AdvancedSettings
        register={register}
        errors={errors}
        enabled={aiEnabled}
      />

      {/* 预览 */}
      <BookPreview
        name={previewData.name}
        description={previewData.description}
        isDefault={previewData.isDefault}
        aiEnabled={previewData.aiEnabled}
      />

      {/* 底部按钮 - 在页面组件中实现 */}
    </form>
  );
}
