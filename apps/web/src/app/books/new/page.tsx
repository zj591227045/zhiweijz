"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { BookForm, BookFormValues } from "@/components/books/book-form";
import { useAccountBookStore } from "@/store/account-book-store";
import { toast } from "sonner";

export default function CreateBookPage() {
  const router = useRouter();
  const { createAccountBook } = useAccountBookStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 提交表单
  const handleSubmit = async (data: BookFormValues) => {
    setIsSubmitting(true);
    
    try {
      await createAccountBook({
        name: data.name,
        description: data.description,
        isDefault: data.isDefault,
      });
      
      toast.success("账本创建成功");
      router.push("/books");
    } catch (error) {
      console.error("创建账本失败:", error);
      toast.error("创建账本失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
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
