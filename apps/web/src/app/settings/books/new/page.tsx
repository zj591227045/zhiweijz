'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { BookForm, BookFormValues } from '@/components/books/book-form';
import { useAccountBookStore } from '@/store/account-book-store';
import { toast } from 'sonner';
import '../book-form.css';

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

      toast.success('账本创建成功');
      router.push('/settings/books');
    } catch (error) {
      console.error('创建账本失败:', error);
      toast.error('创建账本失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 取消操作
  const handleCancel = () => {
    router.push('/settings/books');
  };

  return (
    <PageContainer
      title="创建账本"
      showBackButton={true}
      onBackClick={() => router.push('/settings/books')}
      showBottomNav={false}
    >
      <div className="book-form">
        <BookForm id="book-form" isSubmitting={isSubmitting} onSubmit={handleSubmit} />
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
              fontSize: '16px',
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
                创建中...
              </>
            ) : (
              <>
                <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                创建账本
              </>
            )}
          </button>
        </div>
      </div>
    </PageContainer>
  );
}
