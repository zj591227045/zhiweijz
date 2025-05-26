'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useAccountBookStore } from '@zhiweijz/web';
import { PageContainer } from '@/components/layout/page-container';
import { exportService } from '@/lib/api-services';
import { toast } from 'sonner';
import './export.css';

export default function ExportPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { currentAccountBook } = useAccountBookStore();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json'>('csv');

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // 处理导出
  const handleExport = async () => {
    if (!currentAccountBook) {
      toast.error('请先选择账本');
      return;
    }

    try {
      setIsExporting(true);
      
      const response = await exportService.exportTransactions(
        currentAccountBook.id,
        selectedFormat
      );

      // 创建下载链接
      const blob = new Blob([response], { 
        type: selectedFormat === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentAccountBook.name}_交易记录_${new Date().toISOString().split('T')[0]}.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <PageContainer title="数据导出" showBackButton={true} showBottomNav={false}>
      <div className="export-container">
        <div className="export-info">
          <div className="export-info-icon">
            <i className="fas fa-file-export"></i>
          </div>
          <div className="export-info-content">
            <h3>导出交易记录</h3>
            <p>导出当前账本的所有交易记录，包括金额、分类、描述、日期等信息。</p>
          </div>
        </div>

        {currentAccountBook && (
          <div className="current-book-info">
            <div className="current-book-label">当前账本</div>
            <div className="current-book-name">{currentAccountBook.name}</div>
          </div>
        )}

        <div className="export-options">
          <div className="option-group">
            <div className="option-title">导出格式</div>
            <div className="format-options">
              <label className={`format-option ${selectedFormat === 'csv' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={selectedFormat === 'csv'}
                  onChange={(e) => setSelectedFormat(e.target.value as 'csv' | 'json')}
                />
                <div className="format-option-content">
                  <div className="format-option-icon">
                    <i className="fas fa-file-csv"></i>
                  </div>
                  <div className="format-option-info">
                    <div className="format-option-name">CSV 格式</div>
                    <div className="format-option-desc">适合在 Excel 中打开</div>
                  </div>
                </div>
              </label>

              <label className={`format-option ${selectedFormat === 'json' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={selectedFormat === 'json'}
                  onChange={(e) => setSelectedFormat(e.target.value as 'csv' | 'json')}
                />
                <div className="format-option-content">
                  <div className="format-option-icon">
                    <i className="fas fa-file-code"></i>
                  </div>
                  <div className="format-option-info">
                    <div className="format-option-name">JSON 格式</div>
                    <div className="format-option-desc">适合程序处理</div>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="export-actions">
          <button
            className="export-button"
            onClick={handleExport}
            disabled={isExporting || !currentAccountBook}
          >
            {isExporting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                导出中...
              </>
            ) : (
              <>
                <i className="fas fa-download"></i>
                开始导出
              </>
            )}
          </button>
        </div>

        <div className="export-notes">
          <div className="notes-title">
            <i className="fas fa-info-circle"></i>
            注意事项
          </div>
          <ul className="notes-list">
            <li>导出的数据仅包含当前账本的交易记录</li>
            <li>导出文件将自动下载到您的设备</li>
            <li>CSV 格式可以直接在 Excel 或其他表格软件中打开</li>
            <li>JSON 格式适合开发者或需要程序处理的场景</li>
          </ul>
        </div>
      </div>
    </PageContainer>
  );
}
