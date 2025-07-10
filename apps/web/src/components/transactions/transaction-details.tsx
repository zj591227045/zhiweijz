'use client';

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
}

export function TransactionDetails({ onSubmit, isSubmitting }: TransactionDetailsProps) {
  const { type, description, date, time, tagIds, categoryId, amount, attachments, setDescription, setDate, setTime, setTagIds, setAttachments } =
    useTransactionFormStore();
  const { currentAccountBook } = useAccountBookStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };





  return (
    <form onSubmit={handleSubmit}>
      {/* iOS 风格表单 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 描述输入 */}
        <div style={{
          backgroundColor: 'var(--background-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px'
        }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--text-secondary)',
            marginBottom: '8px'
          }}>描述</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="添加描述..."
            disabled={isSubmitting}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: '16px',
              color: 'var(--text-color)',
              padding: '0'
            }}
          />
        </div>

        {/* 日期和时间 - 并排布局 */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{
            flex: 1,
            backgroundColor: 'var(--background-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-secondary)',
              marginBottom: '8px'
            }}>日期</label>
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
                fontSize: '16px',
                color: 'var(--text-color)',
                padding: '0'
              }}
            />
          </div>

          <div style={{
            flex: 1,
            backgroundColor: 'var(--background-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-secondary)',
              marginBottom: '8px'
            }}>时间</label>
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
                fontSize: '16px',
                color: 'var(--text-color)',
                padding: '0'
              }}
            />
          </div>
        </div>

        {/* 预算选择（仅支出类型显示） */}
        {type === TransactionType.EXPENSE && (
          <div style={{
            backgroundColor: 'var(--background-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <BudgetSelector />
          </div>
        )}

        {/* 移动端优化的标签选择 */}
        {currentAccountBook?.id && (
          <div style={{
            backgroundColor: 'var(--background-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px' // 增加底部间距，避免与保存按钮重叠
          }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-secondary)',
              marginBottom: '12px'
            }}>标签</label>

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
        <div style={{
          backgroundColor: 'var(--background-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--text-secondary)',
            marginBottom: '12px'
          }}>附件</label>

          <TransactionAttachmentUpload
            initialAttachments={attachments}
            disabled={isSubmitting}
            onChange={setAttachments}
          />
        </div>
      </div>

      {/* iOS 风格操作按钮 */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginTop: '32px', // 增加顶部间距
        paddingBottom: '32px', // 增加底部间距
        position: 'sticky', // 让按钮固定在底部
        bottom: '0',
        backgroundColor: 'var(--background-color)',
        borderTop: '1px solid var(--border-color)',
        marginLeft: '-20px',
        marginRight: '-20px',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingTop: '16px'
      }}>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            flex: 1,
            height: '48px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.6 : 1,
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
        >
          {isSubmitting ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  );
}
