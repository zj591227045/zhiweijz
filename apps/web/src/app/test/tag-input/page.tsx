'use client';

import { useState } from 'react';
import { TagSelector, MobileTagSelector } from '@/components/tags/tag-selector';
import { useAccountBookStore } from '@/store/account-book-store';

/**
 * 标签输入测试页面
 * 用于测试Android中文输入法兼容性
 */
export default function TagInputTestPage() {
  const { accountBooks } = useAccountBookStore();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showMobileSelector, setShowMobileSelector] = useState(false);
  
  const defaultAccountBook = accountBooks?.[0];

  if (!defaultAccountBook) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">标签输入测试</h1>
        <p>请先创建账本</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">标签输入测试页面</h1>
      
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">测试说明</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">Android中文输入法测试</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 测试中文输入时是否显示"创建新标签"提示</li>
            <li>• 测试英文输入时是否正常工作</li>
            <li>• 测试混合中英文输入</li>
            <li>• 测试输入法切换过程中的行为</li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">桌面端标签选择器</h2>
        <div className="max-w-md">
          <TagSelector
            accountBookId={defaultAccountBook.id}
            selectedTagIds={selectedTagIds}
            onSelectionChange={setSelectedTagIds}
            placeholder="测试中文输入：家庭、工作、娱乐"
            allowCreate={true}
          />
        </div>
        <div className="text-sm text-gray-600">
          已选择标签ID: {selectedTagIds.join(', ') || '无'}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">移动端标签选择器</h2>
        <button
          onClick={() => setShowMobileSelector(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          打开移动端标签选择器
        </button>
        
        <MobileTagSelector
          isOpen={showMobileSelector}
          onClose={() => setShowMobileSelector(false)}
          accountBookId={defaultAccountBook.id}
          selectedTagIds={selectedTagIds}
          onSelectionChange={setSelectedTagIds}
          placeholder="测试中文输入：家庭、工作、娱乐"
          allowCreate={true}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">测试用例</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium mb-2">中文输入测试</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 输入"家庭"</li>
              <li>• 输入"工作"</li>
              <li>• 输入"娱乐"</li>
              <li>• 输入"购物"</li>
            </ul>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium mb-2">英文输入测试</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 输入"home"</li>
              <li>• 输入"work"</li>
              <li>• 输入"entertainment"</li>
              <li>• 输入"shopping"</li>
            </ul>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium mb-2">混合输入测试</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 输入"家庭Home"</li>
              <li>• 输入"Work工作"</li>
              <li>• 输入"娱乐Fun"</li>
            </ul>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium mb-2">特殊情况测试</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 输入过程中切换输入法</li>
              <li>• 输入拼音但不选择候选词</li>
              <li>• 快速输入和删除</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">预期行为</h2>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <ul className="text-sm text-green-700 space-y-1">
            <li>✅ 中文输入时应该显示"创建新标签"提示</li>
            <li>✅ 英文输入时应该正常显示"创建新标签"提示</li>
            <li>✅ 输入法切换过程中不应该出现异常</li>
            <li>✅ 已存在的标签名称不应该显示创建提示</li>
            <li>✅ 空输入或仅空格时不应该显示创建提示</li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">调试信息</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm space-y-1">
            <div>用户代理: {typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A'}</div>
            <div>是否Android: {typeof window !== 'undefined' ? /android/i.test(window.navigator.userAgent) : 'N/A'}</div>
            <div>是否Capacitor: {typeof window !== 'undefined' ? !!(window as any).Capacitor : 'N/A'}</div>
            <div>当前账本: {defaultAccountBook.name} ({defaultAccountBook.id})</div>
          </div>
        </div>
      </div>
    </div>
  );
}
