"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { BookForm, BookFormValues } from "@/components/books/book-form";
import { useAccountBookStore } from "@/store/account-book-store";
import { toast } from "sonner";
import { AccountBook } from "@/types";
import "../../book-form.css";

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

  // 取消操作
  const handleCancel = () => {
    router.push("/books");
  };

  return (
    <PageContainer
      title="编辑账本"
      showBackButton={true}
      activeNavItem="profile"
    >
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div style={{ textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: 'var(--primary-color, #3b82f6)', marginBottom: '12px' }}></i>
            <p style={{ color: 'var(--text-secondary, #6b7280)', margin: 0 }}>加载中...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="book-form">
            <BookForm
              id="book-form"
              book={book}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
            />
          </div>

          {/* 底部操作按钮 */}
          <div className="bottom-button-container">
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="secondary-button"
                onClick={handleCancel}
                disabled={isSubmitting}
                style={{ 
                  flex: '1',
                  padding: '14px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary, #6b7280)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '8px',
                  fontWeight: '500',
                  fontSize: '16px'
                }}
              >
                取消
              </button>
              <button
                type="submit"
                form="book-form"
                className="save-button"
                disabled={isSubmitting}
                style={{ flex: '2' }}
              >
                {isSubmitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                    保存中...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                    保存更改
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
