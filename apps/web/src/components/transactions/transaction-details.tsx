'use client';

import { useRef, useEffect } from 'react';
import { useTransactionFormStore } from '@/store/transaction-form-store';
import { useBudgetStore } from '@/store/budget-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { TransactionType } from '@/types';
import { BudgetSelector } from './budget-selector';
import { TagSelector } from '../tags/tag-selector';
import { TagRecommendation } from '../tags/tag-recommendation';
import { TagTemplateSelector } from '../tags/tag-template';
import { MobileTagSection } from '../tags/mobile-tag-section';
import { TransactionAttachmentUpload } from './transaction-attachment-upload';

interface TransactionDetailsProps {
  onSubmit: () => void;
  isSubmitting: boolean;
  isEditMode?: boolean;
}

export function TransactionDetails({
  onSubmit,
  isSubmitting,
  isEditMode = false,
}: TransactionDetailsProps) {
  const {
    type,
    description,
    date,
    time,
    tagIds,
    categoryId,
    amount,
    attachments,
    setDescription,
    setDate,
    setTime,
    setTagIds,
    setAttachments,
  } = useTransactionFormStore();
  const { currentAccountBook } = useAccountBookStore();

  // 修复光标位置问题
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursorPosition, setCursorPosition] = React.useState<number | null>(null);

  // 恢复光标位置
  useEffect(() => {
    if (inputRef.current && cursorPosition !== null) {
      inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
    }
  }, [description, cursorPosition]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* iOS 风格表单 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}> {/* 减少从16px到12px */}
        {/* 描述输入 */}
        <div
          style={{
            backgroundColor: 'var(--background-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px', /* 减少从12px到10px */
            padding: '12px', /* 减少从16px到12px */
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: '13px', /* 减少从14px到13px */
              fontWeight: '500',
              color: 'var(--text-secondary)',
              marginBottom: '6px', /* 减少从8px到6px */
            }}
          >
            描述
          </label>
          <input
            ref={inputRef}
            type="text"
            value={description}
            onChange={(e) => {
              const target = e.target;
              setCursorPosition(target.selectionStart);
              setDescription(target.value);
            }}
            placeholder="添加描述..."
            disabled={isSubmitting}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: '15px', /* 减少从16px到15px */
              color: 'var(--text-color)',
              padding: '0',
            }}
          />
        </div>

        {/* 日期和时间 - 并排布局 */}
        <div style={{ display: 'flex', gap: '10px' }}> {/* 减少从12px到10px */}
          <div
            style={{
              flex: 1,
              backgroundColor: 'var(--background-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px', /* 减少从12px到10px */
              padding: '12px', /* 减少从16px到12px */
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: '13px', /* 减少从14px到13px */
                fontWeight: '500',
                color: 'var(--text-secondary)',
                marginBottom: '6px', /* 减少从8px到6px */
              }}
            >
              日期
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={isSubmitting}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                fontSize: '15px', /* 减少从16px到15px */
                color: 'var(--text-color)',
                padding: '0',
              }}
            />
          </div>

          <div
            style={{
              flex: 1,
              backgroundColor: 'var(--background-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px', /* 减少从12px到10px */
              padding: '12px', /* 减少从16px到12px */
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: '13px', /* 减少从14px到13px */
                fontWeight: '500',
                color: 'var(--text-secondary)',
                marginBottom: '6px', /* 减少从8px到6px */
              }}
            >
              时间
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              disabled={isSubmitting}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                fontSize: '15px', /* 减少从16px到15px */
                color: 'var(--text-color)',
                padding: '0',
              }}
            />
          </div>
        </div>

        {/* 预算选择（仅支出类型显示） */}
        {type === TransactionType.EXPENSE && (
          <div
            style={{
              backgroundColor: 'var(--background-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px', /* 减少从12px到10px */
              padding: '12px', /* 减少从16px到12px */
            }}
          >
            <BudgetSelector isEditMode={isEditMode} />
          </div>
        )}

        {/* 移动端优化的标签选择 */}
        {currentAccountBook?.id && (
          <div
            style={{
              backgroundColor: 'var(--background-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px', /* 减少从12px到10px */
              padding: '12px', /* 减少从16px到12px */
              marginBottom: '12px', /* 减少从16px到12px */
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: '13px', /* 减少从14px到13px */
                fontWeight: '500',
                color: 'var(--text-secondary)',
                marginBottom: '8px', /* 减少从12px到8px */
              }}
            >
              标签
            </label>

            {/* 使用移动端优化的标签组件 */}
            <MobileTagSection
              accountBookId={currentAccountBook.id}
              categoryId={categoryId}
              description={description}
              amount={parseFloat(amount) || undefined}
              selectedTagIds={tagIds}
              onSelectionChange={setTagIds}
              disabled={isSubmitting}
              onTagSelectionComplete={() => {
                // 标签选择完成时的自动保存逻辑可以在这里添加
                console.log('标签选择完成，当前选中:', tagIds);
              }}
            />
          </div>
        )}

        {/* 附件上传 */}
        <div
          style={{
            backgroundColor: 'var(--background-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px', /* 减少从12px到10px */
            padding: '12px', /* 减少从16px到12px */
            marginBottom: '12px', /* 减少从16px到12px */
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: '13px', /* 减少从14px到13px */
              fontWeight: '500',
              color: 'var(--text-secondary)',
              marginBottom: '8px', /* 减少从12px到8px */
            }}
          >
            附件
          </label>

          <TransactionAttachmentUpload
            initialAttachments={attachments}
            disabled={isSubmitting}
            onChange={setAttachments}
          />
        </div>
      </div>

      {/* iOS 风格操作按钮 */}
      <div
        style={{
          display: 'flex',
          gap: '10px', /* 减少从12px到10px */
          marginTop: '16px', /* 减少间距 */
          paddingBottom: '0', /* 移除底部padding，减少空白 */
          /* 移除sticky定位，让按钮在页面内容底部 */
        }}
      >
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            flex: 1,
            height: '44px', /* 减少从48px到44px */
            borderRadius: '10px', /* 减少从12px到10px */
            border: 'none',
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            fontSize: '15px', /* 减少从16px到15px */
            fontWeight: '600',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.6 : 1,
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          {isSubmitting ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  );
}
