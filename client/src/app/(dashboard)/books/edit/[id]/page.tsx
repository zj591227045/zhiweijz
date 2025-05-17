"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/page-container";
import { BookForm, BookFormValues } from "@/components/books/book-form";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { AccountBook } from "@/types";
import "../../form/book-form.css";

interface EditBookPageProps {
  params: {
    id: string;
  };
}

export default function EditBookPage({ params }: EditBookPageProps) {
  const router = useRouter();
  const { id } = params;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 获取账本详情
  const { data: book, isLoading, error } = useQuery({
    queryKey: ["book", id],
    queryFn: async () => {
      const response = await apiClient.get<AccountBook>(`/account-books/${id}`);
      return response;
    },
  });

  // 更新账本的mutation
  const updateBookMutation = useMutation({
    mutationFn: async (data: BookFormValues) => {
      return apiClient.put(`/account-books/${id}`, {
        name: data.name,
        description: data.description,
        isDefault: data.isDefault,
        aiService: data.aiService.enabled ? {
          provider: data.aiService.provider,
          model: data.aiService.model,
          apiKey: data.aiService.apiKey,
          customPrompt: data.aiService.customPrompt,
          language: data.aiService.language,
        } : undefined,
      });
    },
    onSuccess: () => {
      toast.success("账本更新成功");
      router.push("/books");
    },
    onError: (error: any) => {
      console.error("更新账本失败:", error);
      toast.error(error.response?.data?.message || "更新账本失败，请重试");
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // 提交表单
  const handleSubmit = async (data: BookFormValues) => {
    setIsSubmitting(true);
    updateBookMutation.mutate(data);
  };

  // 错误处理
  useEffect(() => {
    if (error) {
      toast.error("获取账本详情失败");
      router.push("/books");
    }
  }, [error, router]);

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
      title="编辑账本"
      rightActions={rightActions}
      showBackButton={true}
      activeNavItem="profile"
    >
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : (
        <div className="book-form">
          <BookForm
            id="book-form"
            book={book}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />
        </div>
      )}
      
      {/* 底部保存按钮 */}
      {!isLoading && (
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
      )}
    </PageContainer>
  );
}
