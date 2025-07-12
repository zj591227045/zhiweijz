'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { adminApi } from '@/lib/admin-api-client';

interface PlaceholderDescriptions {
  [key: string]: {
    description: string;
    placeholders: {
      [key: string]: string;
    };
  };
}

interface PlaceholderHelpProps {
  type?: 'relevanceCheck' | 'smartAccounting' | 'imageAnalysis';
  className?: string;
}

export default function PlaceholderHelp({ type, className = '' }: PlaceholderHelpProps) {
  const [descriptions, setDescriptions] = useState<PlaceholderDescriptions>({});
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const loadDescriptions = async () => {
    if (Object.keys(descriptions).length > 0) return; // 已加载过
    
    setLoading(true);
    try {
      const response = await adminApi.get('/api/admin/prompt-utils/placeholders');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDescriptions(data.data);
        }
      }
    } catch (error) {
      console.error('加载占位符说明失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      loadDescriptions();
    }
  };

  const getRelevantDescriptions = () => {
    if (type && descriptions[type]) {
      return { [type]: descriptions[type] };
    }
    return descriptions;
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="sm" 
        className={`text-blue-600 hover:text-blue-800 hover:bg-blue-50 ${className}`}
        onClick={() => handleOpen(true)}
      >
        <QuestionMarkCircleIcon className="w-4 h-4 mr-1" />
        占位符说明
      </Button>
      
      {open && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setOpen(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">占位符使用说明</h2>
                <p className="text-sm text-gray-600 mt-1">
                  在提示词中使用占位符可以动态插入数据，提高AI分析的准确性
                </p>
              </div>
              <button
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                onClick={() => setOpen(false)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-gray-500">加载中...</div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 占位符格式说明 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">📝 基本格式</h4>
                    <div className="text-sm text-blue-700">
                      <p>占位符格式：<code className="bg-blue-100 px-2 py-1 rounded">{'{{variableName}}'}</code></p>
                      <p className="mt-2">例如：<code className="bg-blue-100 px-2 py-1 rounded">{'{{description}}'}</code> 会被替换为实际的用户描述内容</p>
                    </div>
                  </div>

                  {/* 各类型占位符说明 */}
                  {Object.entries(getRelevantDescriptions()).map(([key, info]) => (
                    <div key={key} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className="font-medium text-gray-900">
                          {key === 'relevanceCheck' && '记账相关性判断'}
                          {key === 'smartAccounting' && '智能记账分析'}
                          {key === 'imageAnalysis' && '图片分析'}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {Object.keys(info.placeholders).length} 个占位符
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{info.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(info.placeholders).map(([placeholder, description]) => (
                          <div key={placeholder} className="bg-gray-50 rounded p-3">
                            <code className="text-sm font-mono bg-gray-200 px-2 py-1 rounded block mb-1">
                              {placeholder}
                            </code>
                            <p className="text-xs text-gray-600">{description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* 使用建议 */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">💡 使用建议</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• 提示词应简洁明了，避免过多无关信息以减少token消耗</li>
                      <li>• 使用明确的输出格式要求（如JSON），便于系统解析</li>
                      <li>• 占位符会在运行时自动替换，无需手动输入实际值</li>
                      <li>• 针对不同场景优化提示词内容，提高识别准确率</li>
                      <li>• 定期测试和优化提示词效果</li>
                    </ul>
                  </div>

                  {/* 示例 */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-medium text-amber-800 mb-2">📋 示例</h4>
                    <div className="text-sm text-amber-700 space-y-3">
                      <div>
                        <p className="font-medium">原始模板：</p>
                        <code className="bg-amber-100 px-2 py-1 rounded block mt-1">
                          请分析用户描述：{'{{description}}'}，当前日期是{'{{currentDate}}'}
                        </code>
                      </div>
                      <div>
                        <p className="font-medium">替换后结果：</p>
                        <code className="bg-amber-100 px-2 py-1 rounded block mt-1">
                          请分析用户描述：今天买了一杯咖啡花了25元，当前日期是2024-01-01
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}