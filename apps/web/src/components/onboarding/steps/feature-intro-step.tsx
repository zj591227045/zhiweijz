'use client';

import { useState } from 'react';
import { useOnboardingStore } from '@/store/onboarding-store';

interface FeatureItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  details: string[];
}

const features: FeatureItem[] = [
  {
    id: 'add-transaction',
    icon: 'fas fa-plus-circle',
    title: '添加记账记录',
    description: '快速记录收入和支出',
    details: [
      '支持多种分类选择',
      '可添加备注和标签',
      '支持拍照记录凭证',
    ],
  },
  {
    id: 'view-statistics',
    icon: 'fas fa-chart-bar',
    title: '查看统计数据',
    description: '直观了解财务状况',
    details: [
      '月度/年度收支统计',
      '分类支出分析',
      '趋势图表展示',
    ],
  },
  {
    id: 'budget-tracking',
    icon: 'fas fa-target',
    title: '预算执行情况',
    description: '实时监控预算使用',
    details: [
      '预算进度可视化',
      '超支预警提醒',
      '剩余预算计算',
    ],
  },
  {
    id: 'import-records',
    icon: 'fas fa-file-import',
    title: '导入记录',
    description: '从其他应用导入数据',
    details: [
      '支持多种格式导入',
      '智能数据解析',
      '快速数据迁移',
    ],
  },
];

export function FeatureIntroStep() {
  const { completeOnboarding, previousStep } = useOnboardingStore();
  const [isCompleting, setIsCompleting] = useState(false);

  // 处理导入记录
  const handleImportRecords = () => {
    const importUrl = 'https://import.zhiweijz.cn:1443';
    
    // 只在新窗口打开导入页面，不使用fallback策略
    if (typeof window !== 'undefined') {
      try {
        // 尝试在新窗口打开，不检查结果
        window.open(importUrl, '_blank', 'noopener,noreferrer');
      } catch (error) {
        // 静默处理错误，不进行任何跳转
        console.warn('Failed to open new window:', error);
      }
    }
  };

  // 处理完成引导
  const handleComplete = async () => {
    setIsCompleting(true);

    try {
      // 模拟完成处理
      await new Promise(resolve => setTimeout(resolve, 1000));
      completeOnboarding();

      // 跳转到主页面
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard';
      }
    } catch (error) {
      // 静默处理错误
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="onboarding-step">
      <div className="onboarding-step-title">功能介绍</div>
      <div className="onboarding-step-description">
        了解核心功能，快速上手使用
      </div>

      {/* 所有功能介绍 */}
      <div className="features-overview">
        {features.map((feature, index) => (
          <div 
            key={feature.id} 
            className={`feature-overview-card ${feature.id === 'import-records' ? 'clickable' : ''}`}
            onClick={feature.id === 'import-records' ? handleImportRecords : undefined}
            style={feature.id === 'import-records' ? { cursor: 'pointer' } : {}}
          >
            <div className="feature-overview-header">
              <div className="feature-overview-icon">
                <i className={feature.icon}></i>
              </div>
              <div className="feature-overview-content">
                <div className="feature-overview-title">
                  {feature.title}
                  {feature.id === 'import-records' && (
                    <i className="fas fa-external-link-alt" style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.7 }}></i>
                  )}
                </div>
                <div className="feature-overview-description">{feature.description}</div>
              </div>
            </div>
            <ul className="feature-overview-details">
              {feature.details.map((detail, detailIndex) => (
                <li key={detailIndex} className="feature-overview-detail">
                  <i className="fas fa-check-circle"></i>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* 完成按钮 */}
      <div className="onboarding-button-group">
        <button
          className="onboarding-button onboarding-button-secondary"
          onClick={previousStep}
          disabled={isCompleting}
        >
          上一步
        </button>
        <button
          className="onboarding-button onboarding-button-primary"
          onClick={handleComplete}
          disabled={isCompleting}
        >
          {isCompleting ? (
            <>
              <span className="loading-spinner"></span>
              完成中...
            </>
          ) : (
            '开始记账'
          )}
        </button>
      </div>
    </div>
  );
}
