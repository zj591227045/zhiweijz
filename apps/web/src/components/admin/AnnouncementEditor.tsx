import { useState, useEffect, useRef } from 'react';
import { Announcement, CreateAnnouncementData } from '@/store/admin/useAnnouncementManagement';
import { XMarkIcon, LinkIcon, EyeIcon } from '@heroicons/react/24/outline';

interface AnnouncementEditorProps {
  announcement?: Announcement | null;
  onSave: (data: CreateAnnouncementData) => Promise<void>;
  onCancel: () => void;
}

interface LinkModalData {
  text: string;
  url: string;
  isInternal: boolean;
}

export function AnnouncementEditor({ announcement, onSave, onCancel }: AnnouncementEditorProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
    publishedAt: '',
    expiresAt: '',
    targetUserType: 'all'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkData, setLinkData] = useState<LinkModalData>({
    text: '',
    url: '',
    isInternal: true
  });
  const [cursorPosition, setCursorPosition] = useState(0);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // 初始化表单数据
  useEffect(() => {
    if (announcement) {
      setFormData({
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        publishedAt: announcement.publishedAt ? announcement.publishedAt.slice(0, 16) : '',
        expiresAt: announcement.expiresAt ? announcement.expiresAt.slice(0, 16) : '',
        targetUserType: announcement.targetUserType
      });
    } else {
      setFormData({
        title: '',
        content: '',
        priority: 'NORMAL',
        publishedAt: '',
        expiresAt: '',
        targetUserType: 'all'
      });
    }
  }, [announcement]);

  // 表单验证
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = '标题不能为空';
    } else if (formData.title.length > 200) {
      newErrors.title = '标题不能超过200个字符';
    }

    if (!formData.content.trim()) {
      newErrors.content = '内容不能为空';
    } else if (formData.content.length > 10000) {
      newErrors.content = '内容不能超过10000个字符';
    }

    if (formData.publishedAt && formData.expiresAt) {
      const publishedDate = new Date(formData.publishedAt);
      const expiresDate = new Date(formData.expiresAt);
      if (expiresDate <= publishedDate) {
        newErrors.expiresAt = '过期时间必须晚于生效时间';
      }
    }

    if (formData.expiresAt && !formData.publishedAt) {
      const expiresDate = new Date(formData.expiresAt);
      const now = new Date();
      if (expiresDate <= now) {
        newErrors.expiresAt = '过期时间必须晚于当前时间';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData: CreateAnnouncementData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        priority: formData.priority,
        targetUserType: formData.targetUserType
      };

      if (formData.publishedAt) {
        // 转换为ISO字符串格式
        submitData.publishedAt = new Date(formData.publishedAt).toISOString();
      }

      if (formData.expiresAt) {
        // 转换为ISO字符串格式
        submitData.expiresAt = new Date(formData.expiresAt).toISOString();
      }

      await onSave(submitData);
    } catch (error) {
      console.error('保存公告失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理输入变化
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // 处理光标位置变化
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart;
    setCursorPosition(position);
    handleInputChange('content', value);
  };

  // 插入超链接
  const handleInsertLink = () => {
    if (contentTextareaRef.current) {
      const textarea = contentTextareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = formData.content.substring(start, end);
      
      setLinkData({
        text: selectedText || '',
        url: '',
        isInternal: true
      });
      setCursorPosition(start);
      setShowLinkModal(true);
    }
  };

  // 确认插入链接
  const handleConfirmLink = () => {
    if (!linkData.text.trim() || !linkData.url.trim()) {
      return;
    }

    const linkMarkdown = `[${linkData.text}](${linkData.url})`;
    const textarea = contentTextareaRef.current;
    
    if (textarea) {
      const start = cursorPosition;
      const end = cursorPosition;
      const newContent = 
        formData.content.substring(0, start) + 
        linkMarkdown + 
        formData.content.substring(end);
      
      handleInputChange('content', newContent);
      
      // 设置新的光标位置
      setTimeout(() => {
        const newPosition = start + linkMarkdown.length;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
      }, 0);
    }

    setShowLinkModal(false);
    setLinkData({ text: '', url: '', isInternal: true });
  };

  // 解析Markdown链接为HTML
  const parseLinksToHtml = (content: string) => {
    let result = content;
    
    // 1. 匹配标准Markdown链接格式 [文本](URL)
    const standardLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    result = result.replace(standardLinkRegex, (match, text, url) => {
      // 判断是否为内部链接
      const isInternal = url.startsWith('/') || url.startsWith('#') || 
                        (!url.startsWith('http://') && !url.startsWith('https://'));
      const target = isInternal ? '_self' : '_blank';
      const rel = isInternal ? '' : 'noopener noreferrer';
      
      return `<a href="${url}" target="${target}" ${rel ? `rel="${rel}"` : ''} 
              style="color: #3b82f6; text-decoration: underline; cursor: pointer;">
              ${text}
              </a>`;
    });
    
    // 2. 匹配方括号链接格式 [文本][URL]
    const bracketLinkRegex = /\[([^\]]+)\]\[([^\]]+)\]/g;
    result = result.replace(bracketLinkRegex, (match, text, url) => {
      // 判断是否为内部链接
      const isInternal = url.startsWith('/') || url.startsWith('#') || 
                        (!url.startsWith('http://') && !url.startsWith('https://'));
      const target = isInternal ? '_self' : '_blank';
      const rel = isInternal ? '' : 'noopener noreferrer';
      
      return `<a href="${url}" target="${target}" ${rel ? `rel="${rel}"` : ''} 
              style="color: #3b82f6; text-decoration: underline; cursor: pointer;">
              ${text}
              </a>`;
    });
    
    // 3. 匹配纯URL格式（自动链接）
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
    result = result.replace(urlRegex, (match, url) => {
      // 检查是否已经被包装在链接标签中
      if (result.includes(`href="${url}"`)) {
        return match; // 已经是链接，不重复处理
      }
      
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" 
              style="color: #3b82f6; text-decoration: underline; cursor: pointer;">
              ${url}
              </a>`;
    });
    
    return result;
  };

  // 获取内部页面选项
  const getInternalPageOptions = () => [
    { label: '仪表盘', value: '/dashboard' },
    { label: '账本管理', value: '/account-books' },
    { label: '交易记录', value: '/transactions' },
    { label: '统计分析', value: '/analytics' },
    { label: '设置', value: '/settings' },
    { label: '个人资料', value: '/settings/profile' },
    { label: '安全设置', value: '/settings/security' },
    { label: '通知设置', value: '/settings/notifications' },
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        {/* 头部 */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {announcement ? '编辑公告' : '新建公告'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* 标题 */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              公告标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="请输入公告标题"
              maxLength={200}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {formData.title.length}/200 字符
            </p>
          </div>

          {/* 内容 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                公告内容 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleInsertLink}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <LinkIcon className="h-4 w-4 mr-1" />
                  插入链接
                </button>
              </div>
            </div>
            <textarea
              ref={contentTextareaRef}
              id="content"
              rows={10}
              value={formData.content}
              onChange={handleContentChange}
              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.content ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="请输入公告内容，支持换行和超链接。支持格式：[链接文本](链接地址) 或 [链接文本][链接地址]"
              maxLength={10000}
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-600">{errors.content}</p>
            )}
            <div className="mt-1 flex items-center justify-between text-sm text-gray-500">
              <span>支持链接格式：[文本](URL) 或 [文本][URL] 或直接输入URL</span>
              <span>{formData.content.length}/10000 字符</span>
            </div>
          </div>

          {/* 优先级和目标用户 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 优先级 */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                优先级
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="LOW">低</option>
                <option value="NORMAL">普通</option>
                <option value="HIGH">高</option>
                <option value="URGENT">紧急</option>
              </select>
            </div>

            {/* 目标用户 */}
            <div>
              <label htmlFor="targetUserType" className="block text-sm font-medium text-gray-700">
                目标用户
              </label>
              <select
                id="targetUserType"
                value={formData.targetUserType}
                onChange={(e) => handleInputChange('targetUserType', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">所有用户</option>
                <option value="new">新用户</option>
                <option value="existing">老用户</option>
              </select>
            </div>
          </div>

          {/* 时间设置 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 生效时间 */}
            <div>
              <label htmlFor="publishedAt" className="block text-sm font-medium text-gray-700">
                生效时间
              </label>
              <input
                type="datetime-local"
                id="publishedAt"
                value={formData.publishedAt || ''}
                onChange={(e) => {
                  handleInputChange('publishedAt', e.target.value);
                }}
                className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.publishedAt ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.publishedAt && (
                <p className="mt-1 text-sm text-red-600">{errors.publishedAt}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                留空表示立即生效
              </p>
            </div>

            {/* 过期时间 */}
            <div>
              <label htmlFor="expiresAt" className="block text-sm font-medium text-gray-700">
                过期时间
              </label>
              <input
                type="datetime-local"
                id="expiresAt"
                value={formData.expiresAt || ''}
                onChange={(e) => {
                  handleInputChange('expiresAt', e.target.value);
                }}
                min={formData.publishedAt || new Date().toISOString().slice(0, 16)}
                className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.expiresAt ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.expiresAt && (
                <p className="mt-1 text-sm text-red-600">{errors.expiresAt}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                留空表示永不过期
              </p>
            </div>
          </div>

          {/* 预览区域 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              内容预览
            </label>
            <div className="border border-gray-300 rounded-md p-4 bg-gray-50 min-h-[100px]">
              {formData.content ? (
                <div className="prose prose-sm max-w-none">
                  <div dangerouslySetInnerHTML={{ 
                    __html: parseLinksToHtml(formData.content.replace(/\n/g, '<br>'))
                  }} />
                </div>
              ) : (
                <p className="text-gray-500 italic">内容预览将在这里显示...</p>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>

        {/* 链接插入模态框 */}
        {showLinkModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-60">
            <div className="relative top-1/2 transform -translate-y-1/2 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">插入超链接</h3>
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {/* 链接类型选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    链接类型
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={linkData.isInternal}
                        onChange={() => setLinkData(prev => ({ ...prev, isInternal: true, url: '' }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">内部页面</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={!linkData.isInternal}
                        onChange={() => setLinkData(prev => ({ ...prev, isInternal: false, url: '' }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">外部链接</span>
                    </label>
                  </div>
                </div>

                {/* 链接文本 */}
                <div>
                  <label htmlFor="linkText" className="block text-sm font-medium text-gray-700">
                    链接文本 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="linkText"
                    value={linkData.text}
                    onChange={(e) => setLinkData(prev => ({ ...prev, text: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="请输入链接显示的文本"
                  />
                </div>

                {/* 链接地址 */}
                <div>
                  <label htmlFor="linkUrl" className="block text-sm font-medium text-gray-700">
                    链接地址 <span className="text-red-500">*</span>
                  </label>
                  {linkData.isInternal ? (
                    <select
                      id="linkUrl"
                      value={linkData.url}
                      onChange={(e) => setLinkData(prev => ({ ...prev, url: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">请选择页面</option>
                      {getInternalPageOptions().map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="url"
                      id="linkUrl"
                      value={linkData.url}
                      onChange={(e) => setLinkData(prev => ({ ...prev, url: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="请输入完整的URL地址，如：https://example.com"
                    />
                  )}
                </div>

                {/* 预览 */}
                {linkData.text && linkData.url && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      预览效果
                    </label>
                    <div className="p-3 bg-gray-50 rounded-md border">
                      <a
                        href={linkData.url}
                        target={linkData.isInternal ? '_self' : '_blank'}
                        rel={linkData.isInternal ? '' : 'noopener noreferrer'}
                        className="text-blue-600 underline hover:text-blue-800"
                        onClick={(e) => e.preventDefault()}
                      >
                        {linkData.text}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* 模态框按钮 */}
              <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLink}
                  disabled={!linkData.text.trim() || !linkData.url.trim()}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  插入链接
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 