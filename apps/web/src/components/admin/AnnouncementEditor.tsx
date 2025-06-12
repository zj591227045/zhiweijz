import { useState, useEffect } from 'react';
import { Announcement, CreateAnnouncementData } from '@/store/admin/useAnnouncementManagement';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AnnouncementEditorProps {
  announcement?: Announcement | null;
  onSave: (data: CreateAnnouncementData) => Promise<void>;
  onCancel: () => void;
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

  // 初始化表单数据
  useEffect(() => {
    if (announcement) {
      setFormData({
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        publishedAt: announcement.publishedAt ? announcement.publishedAt.split('T')[0] : '',
        expiresAt: announcement.expiresAt ? announcement.expiresAt.split('T')[0] : '',
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
        submitData.publishedAt = formData.publishedAt;
      }

      if (formData.expiresAt) {
        submitData.expiresAt = formData.expiresAt;
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
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              公告内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              rows={10}
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.content ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="请输入公告内容，支持换行"
              maxLength={10000}
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-600">{errors.content}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {formData.content.length}/10000 字符
            </p>
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
                value={formData.publishedAt ? `${formData.publishedAt}T00:00` : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const dateOnly = value ? value.split('T')[0] : '';
                  handleInputChange('publishedAt', dateOnly);
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
                value={formData.expiresAt ? `${formData.expiresAt}T23:59` : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const dateOnly = value ? value.split('T')[0] : '';
                  handleInputChange('expiresAt', dateOnly);
                }}
                min={formData.publishedAt ? `${formData.publishedAt}T00:00` : new Date().toISOString().slice(0, 16)}
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
                    __html: formData.content.replace(/\n/g, '<br>') 
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
      </div>
    </div>
  );
} 