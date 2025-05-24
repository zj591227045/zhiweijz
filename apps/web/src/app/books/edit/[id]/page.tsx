"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { BookForm, BookFormValues } from "@/components/books/book-form";
import { useAccountBookStore } from "@/store/account-book-store";
import { toast } from "sonner";
import { AccountBook } from "@/types";

interface EditBookPageProps {
  params: {
    id: string;
  };
}

export default function EditBookPage({ params }: EditBookPageProps) {
  const router = useRouter();
  const { id } = params;
  const { accountBooks, updateAccountBook } = useAccountBookStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [book, setBook] = useState<AccountBook | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 获取账本详情
  useEffect(() => {
    const foundBook = accountBooks.find(b => b.id === id);
    if (foundBook) {
      setBook(foundBook);
      setIsLoading(false);
    } else {
      // 如果在store中找不到，可能需要重新获取
      toast.error("账本不存在");
      router.push("/books");
    }
  }, [id, accountBooks, router]);

  // 提交表单
  const handleSubmit = async (data: BookFormValues) => {
    if (!book) return;
    
    setIsSubmitting(true);
    
    try {
      await updateAccountBook(book.id, {
        name: data.name,
        description: data.description,
        isDefault: data.isDefault,
      });
      
      toast.success("账本更新成功");
      router.push("/books");
    } catch (error) {
      console.error("更新账本失败:", error);
      toast.error("更新账本失败，请重试");
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
