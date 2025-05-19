"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/page-container";
import { BookForm, BookFormValues } from "@/components/books/book-form";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import "../form/book-form.css";

export default function CreateBookPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 创建账本的mutation
  const createBookMutation = useMutation({
    mutationFn: async (data: BookFormValues) => {
      // 创建账本
      const newBook = await apiClient.post("/account-books", {
        name: data.name,
        description: data.description,
        aiService: data.aiService.enabled ? {
          provider: data.aiService.provider,
          model: data.aiService.model,
          apiKey: data.aiService.apiKey,
          customPrompt: data.aiService.customPrompt,
          language: data.aiService.language,
        } : undefined,
      });

      // 如果设置为默认账本，调用设置默认账本的API
      if (data.isDefault && newBook && newBook.id) {
        await apiClient.post(`/account-books/${newBook.id}/set-default`);
      }

      return newBook;
    },
    onSuccess: () => {
      toast.success("账本创建成功");
      router.push("/books");
    },
    onError: (error: any) => {
      console.error("创建账本失败:", error);
      toast.error(error.response?.data?.message || "创建账本失败，请重试");
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // 提交表单
  const handleSubmit = async (data: BookFormValues) => {
    setIsSubmitting(true);
    createBookMutation.mutate(data);
  };

  // 右侧操作按钮
  const rightActions = (
    <button
      className="icon-button"
      type="submit"
      form="book-form"
      disabled={isSubmitting}
      aria-label="保存"
    >
      <i className="fas fa-save"></i>
    </button>
  );

  return (
    <PageContainer
      title="创建账本"
      rightActions={rightActions}
      showBackButton={true}
      activeNavItem="profile"
    >
      <div className="book-form">
        <BookForm
          id="book-form"
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      </div>

      {/* 底部保存按钮 */}
      <div className="bottom-button-container">
        <button
          type="submit"
          form="book-form"
          className="save-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? "保存中..." : "保存"}
        </button>
      </div>
    </PageContainer>
  );
}
